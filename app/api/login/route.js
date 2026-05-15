import dbConnect from '@/lib/mongodb';
import Account from '@/models/Account';
import { NextResponse } from 'next/server';
import { getClientIp, checkLoginThrottle, recordLoginFailure, recordLoginSuccess } from '@/lib/login-security';
import { hashPassword, verifyPassword } from '@/lib/passwords';

export async function POST(request) {
  try {
    await dbConnect();

    const { username, password } = await request.json();
    const normalizedUsername = String(username || '').trim();
    const clientIp = getClientIp(request);

    if (!normalizedUsername || !password) {
      return NextResponse.json(
        { success: false, message: 'Username and password are required' },
        { status: 400 }
      );
    }

    const throttleCheck = checkLoginThrottle({ ip: clientIp, username: normalizedUsername });

    if (!throttleCheck.allowed) {
      return NextResponse.json(
        { success: false, message: throttleCheck.message },
        { status: throttleCheck.status }
      );
    }

    const user = await Account.findOne({ username: normalizedUsername });

    if (!user) {
      recordLoginFailure({ ip: clientIp, username: normalizedUsername, account: null });

      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    if (user.isActive === false) {
      return NextResponse.json(
        { success: false, message: 'This account is disabled' },
        { status: 403 }
      );
    }

    if (user.lockoutUntil && new Date(user.lockoutUntil) > new Date()) {
      return NextResponse.json(
        { success: false, message: 'This account is temporarily locked. Try again later.' },
        { status: 423 }
      );
    }

    const passwordCheck = verifyPassword(password, user.password);

    if (!passwordCheck.isValid) {
      recordLoginFailure({ ip: clientIp, username: normalizedUsername, account: user });
      await user.save();

      return NextResponse.json({ success: false, message: "Invalid credentials" }, { status: 401 });
    }

    if (passwordCheck.needsUpgrade) {
      user.password = hashPassword(password);
    }

    recordLoginSuccess({ ip: clientIp, username: normalizedUsername, account: user });
    await user.save();

    const response = NextResponse.json({ success: true, user: { name: user.fullName, role: user.role } });

    response.cookies.set('auth_token', JSON.stringify({ role: user.role, name: user.fullName }), {
      httpOnly: true, // Javascript cannot read this (Security)
      secure: process.env.NODE_ENV === 'production', // Use HTTPS in production
      maxAge: 60 * 60 * 24, // 1 Day
      path: '/',
    });

    return response;

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
// import dbConnect from '@/lib/mongodb';

// import Account from '@/models/Account';
// import { NextResponse } from 'next/server';

// export async function POST(request) {
//   try {
//     await dbConnect();
//     const { username, password } = await request.json();

//     // 1. Find the user
//     const user = await Account.findOne({ username });

//     // 2. Check if user exists and password matches
//     if (!user || user.password !== password) {
//       return NextResponse.json({ success: false, message: "Invalid credentials" }, { status: 401 });
//     }

//     // 3. Login Success! (Return the user info so frontend knows who it is)
//     // In a real app, we would set a "Cookie" here. For now, we just return "True".
//     return NextResponse.json({
//       success: true,
//       user: { name: user.fullName, role: user.role }
//     });

//   } catch (error) {
//     return NextResponse.json({ success: false, error: error.message }, { status: 500 });
//   }
// }
