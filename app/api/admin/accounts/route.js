import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Account from '@/models/Account';
import { getAuthenticatedUser } from '@/lib/auth';
import { hashPassword } from '@/lib/passwords';

export async function GET(request) {
  try {
    const user = getAuthenticatedUser(request);
    if (!user || user.role !== 'Admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    await dbConnect();
    const accounts = await Account.find({}, {
      username: 1,
      fullName: 1,
      role: 1,
      isActive: 1,
      createdAt: 1,
      recoveryCodeCreatedAt: 1,
      recoveryCodeUsedAt: 1,
    }).lean();

    const data = accounts.map((a) => ({
      _id: String(a._id),
      username: a.username,
      fullName: a.fullName,
      role: a.role,
      isActive: a.isActive,
      createdAt: a.createdAt,
      recoveryCodeStatus: !a.recoveryCodeCreatedAt
        ? 'none'
        : a.recoveryCodeUsedAt
          ? 'used'
          : 'active',
      recoveryCodeCreatedAt: a.recoveryCodeCreatedAt,
      recoveryCodeUsedAt: a.recoveryCodeUsedAt,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = getAuthenticatedUser(request);
    if (!user || user.role !== 'Admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const { username, fullName, role, password } = await request.json();

    if (!username || !fullName || !role || !password) {
      return NextResponse.json({ success: false, message: 'All fields are required.' }, { status: 400 });
    }

    if (!['Admin', 'Registrar', 'Cashier'].includes(role)) {
      return NextResponse.json({ success: false, message: 'Invalid role.' }, { status: 400 });
    }

    if (String(password).length < 8) {
      return NextResponse.json({ success: false, message: 'Password must be at least 8 characters.' }, { status: 400 });
    }

    await dbConnect();

    const existing = await Account.findOne({ username: String(username).trim() });
    if (existing) {
      return NextResponse.json({ success: false, message: 'Username already taken.' }, { status: 409 });
    }

    const account = await Account.create({
      username: String(username).trim(),
      fullName: String(fullName).trim(),
      role,
      password: hashPassword(String(password)),
    });

    return NextResponse.json({
      success: true,
      data: {
        _id: String(account._id),
        username: account.username,
        fullName: account.fullName,
        role: account.role,
        isActive: account.isActive,
      },
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
