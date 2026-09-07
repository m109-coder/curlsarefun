import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production';

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get current date for "today" query
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Try to fetch real data from database with timeout
    let totalBookings = 0;
    let todaySchedule: any[] = [];
    let recentActivity: any[] = [];
    let activeClients = 0;
    let databaseAvailable = false;

    try {
      const { prisma } = await import('@/lib/db/prisma');
      
      // Race with timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Database timeout')), 10000);
      });
      
      const dataPromise = (async () => {
        // Count all appointments
        const count = await prisma.appointment.count();
        
        // Today's schedule
        const todayAppointments = await prisma.appointment.findMany({
          where: {
            date: {
              gte: today,
              lt: tomorrow,
            },
          },
          include: {
            client: true,
            services: true,
          },
          orderBy: {
            startTime: 'asc',
          },
        });

        // Recent activity (last 10 appointments)
        const recentAppointments = await prisma.appointment.findMany({
          take: 10,
          include: {
            client: true,
            services: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        // Count unique active clients
        const clients = await prisma.client.count();

        return {
          count,
          todayAppointments,
          recentAppointments,
          clients,
        };
      })();

      const data = await Promise.race([dataPromise, timeoutPromise]) as any;
      
      totalBookings = data.count;
      activeClients = data.clients;
      databaseAvailable = true;

      todaySchedule = data.todayAppointments.map((apt: any) => {
        const sortedServices = (apt.services || []).slice().sort((a: any, b: any) => a.executionOrder - b.executionOrder);
        const startMinutes = timeToMinutes(apt.startTime);
        const endMinutes = timeToMinutes(apt.endTime);
        return {
          id: apt.id,
          time: `${apt.startTime} - ${apt.endTime}`,
          startTime: apt.startTime,
          endTime: apt.endTime,
          startMinutes,
          endMinutes,
          clientName: apt.client.name,
          serviceName: sortedServices.map((s: any) => s.name).join(' + '),
          status: apt.status,
        };
      });

      recentActivity = data.recentAppointments.map((apt: any) => {
        const sortedServices = (apt.services || []).slice().sort((a: any, b: any) => a.executionOrder - b.executionOrder);
        return {
          id: apt.id,
          type: 'booking',
          message: `Appointment ${apt.status} - ${apt.client.name} for ${sortedServices.map((s: any) => s.name).join(' + ')}`,
          time: new Date(apt.createdAt).toLocaleString(),
        };
      });
    } catch (dbError) {
      console.log('Database not available, returning fallback data:', dbError instanceof Error ? dbError.message : 'Unknown');
    }

    // Try to fetch Shopify data if configured
    let totalOrders = 0;
    let revenue = 0;

    if (process.env.SHOPIFY_ADMIN_ACCESS_TOKEN && process.env.SHOPIFY_ADMIN_ACCESS_TOKEN !== 'your-admin-api-token-here') {
      try {
        const { getShopifyOrders, getShopifyRevenue } = await import('@/lib/shopify/admin-client');
        const orders = await getShopifyOrders(50);
        totalOrders = orders.length;
        revenue = await getShopifyRevenue(orders);

        // Add orders to recent activity
        const orderActivity = orders.slice(0, 5).map((order: any) => ({
          id: order.id,
          type: 'order',
          message: `Order ${order.name} - $${parseFloat(order.total_price || '0').toFixed(2)}`,
          time: new Date(order.created_at).toLocaleString(),
        }));

        recentActivity = [...orderActivity, ...recentActivity].slice(0, 10);
      } catch (shopifyError) {
        console.log('Shopify not available:', shopifyError);
      }
    }

    return NextResponse.json({
      totalBookings,
      todaySchedule,
      recentActivity,
      activeClients,
      totalOrders,
      revenue,
      databaseAvailable,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}