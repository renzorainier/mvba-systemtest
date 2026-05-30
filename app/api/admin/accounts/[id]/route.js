import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Account from '@/models/Account';
import { getAuthenticatedUser } from '@/lib/auth';

export async function PATCH(request, { params }) {
  try {
    const user = getAuthenticatedUser(request);
    if (!user || user.role !== 'Admin') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const { isActive } = await request.json();

    await dbConnect();
    const account = await Account.findById(id);
    if (!account) {
      return NextResponse.json({ success: false, message: 'Account not found.' }, { status: 404 });
    }

    if (typeof isActive === 'boolean') {
      account.isActive = isActive;
    }

    await account.save();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
