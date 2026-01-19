import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const createRispitAdminUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const email = 'info@rispit.com';
    const password = 'Jaffna!123';
    const role = 'admin';

    // Check if user with this email already exists
    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      console.log('⚠️  User with this email already exists!');
      console.log('Email:', existingUser.email);
      console.log('Username:', existingUser.username);
      console.log('Role:', existingUser.role);
      console.log('Is Active:', existingUser.isActive);
      
      // Ask if user wants to update
      console.log('\n💡 To update this user, delete it first or modify the script.');
      await mongoose.connection.close();
      return;
    }

    // Generate username from email (part before @)
    const username = email.split('@')[0];

    // Create admin user
    const adminUser = new User({
      username: username,
      email: email,
      password: password, // Will be hashed automatically by User model pre-save hook
      role: role,
      fullName: 'Rispit Admin',
      isActive: true
    });

    await adminUser.save();
    
    console.log('\n✅ Admin user created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Username:', username);
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Role:', role);
    console.log('Full Name:', adminUser.fullName);
    console.log('Is Active:', adminUser.isActive);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    
    if (error.code === 11000) {
      console.error('Duplicate key error: User with this username or email already exists');
    }
    
    await mongoose.connection.close();
    process.exit(1);
  }
};

createRispitAdminUser();

