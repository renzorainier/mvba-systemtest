import dbConnect from '@/lib/mongodb';
import Account from '@/models/Account';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers'; // Import cookies

export async function POST(request) {
  try {
    await dbConnect();
    const { username, password } = await request.json();

    const user = await Account.findOne({ username });

    if (!user || user.password !== password) {
      return NextResponse.json({ success: false, message: "Invalid credentials" }, { status: 401 });
    }

    // ✅ LOGIN SUCCESS: Issue the "Badge" (Cookie)
    // We set a cookie named 'auth_token' that lasts for 1 day
    const cookieStore = await cookies();
    cookieStore.set('auth_token', JSON.stringify({ role: user.role, name: user.fullName }), {
      httpOnly: true, // Javascript cannot read this (Security)
      secure: process.env.NODE_ENV === 'production', // Use HTTPS in production
      maxAge: 60 * 60 * 24, // 1 Day
      path: '/',
    });

    return NextResponse.json({ success: true, user: { name: user.fullName, role: user.role } });

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
