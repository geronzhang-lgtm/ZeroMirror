import { NextResponse } from 'next/server';
import { logout } from '@/lib/auth';

export async function POST() {
  try {
    await logout();
    return NextResponse.json({ success: true, message: '退出成功' });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}
