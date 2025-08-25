import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Create a global prisma instance to avoid multiple connections
const prismaGlobal = globalThis;
const prisma = prismaGlobal.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') prismaGlobal.prisma = prisma;

export async function POST(request) {
  try {
    const { firstName, lastName, email, password } = await request.json();

    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      return new Response(
        JSON.stringify({ error: "All fields are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format... Please check!!" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters long" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 1st Check if the user already exists in the database
    // without race conditions we will do a primary check here
    const existingUser = await prisma.experimenters.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: "User with this email already exists. please check or try to login" }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user in the database
    const experimenter = await prisma.experimenters.create({
      data: {
        name: `${firstName.trim()} ${lastName.trim()}`,
        email: email.toLowerCase().trim(),
        password: hashedPassword,
      },
    });

    // Return success response (without the password)
    const { password: _, ...experimenterWithoutPassword } = experimenter;

    return new Response(
      JSON.stringify({ 
        message: "User created successfully", 
        experimenter: experimenterWithoutPassword 
      }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Signup error:", error);
    
    // Backup check handle Prisma unique constraint violation
    // This catches race conditions where two requests try to create the same email simultaneously

    if (error.code === 'P2002') {
      return new Response(
        JSON.stringify({ error: "User with this email already exists" }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    // checking the database connection error
    if (error.code === 'P1001') {
      return new Response(
        JSON.stringify({ error: "Database connection failed" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}