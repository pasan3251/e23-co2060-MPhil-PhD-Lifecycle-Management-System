# Testing Guide: Admin & Student Portals

This guide explains how to set up and test the different user roles in the PGSMS application.

## 1. Initial Setup

Before testing, ensure you have the project dependencies and the database client generated:

```powershell
# Install dependencies
npm install

# Generate Prisma Client
npx prisma generate

# Start development server
npm run dev
```

> **Note:** You must obtain the `.env` file from the team lead. This file is excluded from Git for security reasons.

## 2. Pre-configured Test Accounts

Since we use a shared database and Firebase project, you can use these existing accounts:

### Administrator
- **Email**: `admin@gmail.com`
- **Password**: `123456`
- **URL**: `http://localhost:3001/dashboard/admin`

### Student
- **Email**: `student@gmail.com`
- **URL**: `http://localhost:3001/dashboard/student`

---

## 3. Creating New Test Users

If you need to create your own test accounts, follow these steps:

1.  **Firebase Console**: Manually add a new user in the Firebase Authentication tab with an email and password.
2.  **Sync to Database**: Run the corresponding script to assign the role and create the database profile:

#### To create an Admin:
```powershell
node scripts/seed-admin.js your-email@example.com
```

#### To create a Student:
```powershell
node scripts/seed-student.js your-email@example.com
```

## 4. Troubleshooting

### "Invalid or Expired Token"
If you receive this error during login, it is likely due to a cached session from a deleted user.
- **Solution**: Open the application in a **New Incognito Window** (Ctrl+Shift+N).

### "404 Not Found" on Dashboard
Ensure you are using the correct URL prefix. All dashboards are located under `/dashboard/`:
- ✅ `/dashboard/admin`
- ❌ `/admin`

### Deleting Test Users
To completely remove a user from the local PostgreSQL database:
```powershell
node scripts/delete-user.js your-email@example.com
```
