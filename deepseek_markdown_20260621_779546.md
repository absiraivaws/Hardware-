# Staff Management & User Access Control Module
## Hardware ERP System — Sri Lanka Market

**Version:** 1.0  
**Last Updated:** 2026-06-21  
**Module:** Staff Management, Roles & Permissions, Authentication

---

## Table of Contents

1. [Module Overview](#module-overview)
2. [Staff Management Features](#staff-management-features)
3. [User Roles & Responsibilities](#user-roles--responsibilities)
4. [Permission Matrix](#permission-matrix)
5. [UI Screens & Design](#ui-screens--design)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [Integration with POS](#integration-with-pos)
9. [File Structure](#file-structure)
10. [Implementation Checklist](#implementation-checklist)
11. [Development Phases](#development-phases)

---

## Module Overview

### Purpose
The Staff Management & User Access Control module provides complete employee management and role-based access control for the Hardware ERP system. It ensures:

- ✅ Only authorized staff can access specific modules
- ✅ Every transaction is tracked to a staff member
- ✅ Cashiers, store keepers, and managers have appropriate access
- ✅ Branch-level access control
- ✅ Full audit trail of staff activities

### Target Users
| User Type | Description |
|---|---|
| **Super Admin** | Full system control, all branches, all modules |
| **Owner** | Full access except system settings |
| **Branch Manager** | Full access to assigned branch |
| **Accountant** | Financial modules, reports |
| **Cashier** | POS billing, customer management |
| **Store Keeper** | Inventory, purchases, GRN |
| **Sales Executive** | Quotations, customer management |

---

## Staff Management Features

### 1. Staff Registration

| Field | Type | Required | Description |
|---|---|---|---|
| Staff Code | Auto-generated | Yes | EMP-001, EMP-002... |
| Full Name | Text | Yes | Staff member's full name |
| Email | Email | No | Work email address |
| Phone | Text | Yes | Sri Lanka mobile number |
| Date of Birth | Date | No | For records |
| Profile Photo | Image | No | Staff photo upload |
| Branch | Dropdown | Yes | Assigned branch |
| Role | Dropdown | Yes | Cashier, Manager, etc. |
| Username | Text | Yes | Unique login username |
| Password | Password | Yes | Minimum 8 characters |
| Confirm Password | Password | Yes | Must match password |
| Status | Toggle | Yes | Active / Inactive / Suspended |

### 2. Staff List View

**Features:**
- Search by name, email, staff code
- Filter by branch
- Filter by role
- Filter by status
- Pagination (10, 25, 50, 100 per page)
- Export to CSV/Excel
- Quick actions (Edit, Reset Password, Deactivate)

**Columns Displayed:**
| Column | Description |
|---|---|
| Staff Code | EMP-001 |
| Photo | Profile image thumbnail |
| Full Name | Staff member name |
| Role | Cashier, Manager, etc. |
| Branch | Assigned branch |
| Email | Work email |
| Phone | Mobile number |
| Status | Active/Inactive/Suspended |
| Last Login | Date and time of last login |
| Actions | Edit, Reset Password, Deactivate |

### 3. Staff Profile View

**Sections:**
1. **Personal Information** — Name, email, phone, DOB, photo
2. **Account Information** — Username, role, branch, status
3. **Login History** — Date, time, IP address, device
4. **Activity Log** — All actions performed by staff
5. **Performance Metrics** — Sales count, total sales, average per day

### 4. Staff Activity Logging

**What Gets Logged:**
| Action | Description |
|---|---|
| Login | Staff login with IP and device |
| Logout | Staff logout |
| Sale Created | Invoice number, amount, customer |
| Sale Voided | Invoice number, reason |
| Sale Returned | Invoice number, return amount |
| Purchase Created | Purchase order number, supplier |
| GRN Created | Goods received note number |
| Stock Adjustment | Product, quantity, reason |
| Customer Created | Customer name, credit limit |
| Credit Approved | Customer name, credit amount |
| Payment Received | Invoice number, amount |
| Discount Applied | Invoice number, discount % |
| Password Changed | Staff initiated |
| Profile Updated | Field changed |

### 5. Staff Status Management

| Status | Description | Actions Allowed |
|---|---|---|
| **Active** | Staff can log in and work | Full access based on role |
| **Inactive** | Staff cannot log in | Temporary leave, no access |
| **Suspended** | Staff cannot log in | Disciplinary, no access |
| **Pending** | New staff, not yet approved | No access until approved |

---

## User Roles & Responsibilities

### Role Definitions

| Role | Responsibilities | Access Level |
|---|---|---|
| **Super Admin** | System configuration, all branches, all modules, staff management | 100% |
| **Owner** | Overview, financial reports, credit approval, branch management | 90% |
| **Branch Manager** | Daily branch operations, staff supervision, approval of discounts/credit | 75% |
| **Accountant** | Payments, invoices, financial reports, ledger management | 65% |
| **Cashier** | POS billing, customer payments, cash handling | 40% |
| **Store Keeper** | Inventory management, purchase orders, GRN, stock transfers | 45% |
| **Sales Executive** | Quotations, customer management, sales follow-up | 35% |

### Role Capabilities Matrix

| Module | Action | Super Admin | Owner | Branch Manager | Accountant | Cashier | Store Keeper | Sales Executive |
|---|---|---|---|---|---|---|---|---|
| **Dashboard** | View | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| | View Branch-wise | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| | View Financial KPIs | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

| **Sales & POS** | View | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| | Create Sale | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| | Edit Sale | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| | Delete Sale | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | Void Sale | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| | Discount > 10% | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| | Discount > 25% | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| | View Sales Reports | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| | Export Sales Data | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

| **Purchases** | View | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| | Create PO | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| | Edit PO | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| | Delete PO | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | Create GRN | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| | Purchase Returns | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |

| **Inventory** | View | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| | View Stock Levels | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| | Adjust Stock | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| | Stock Transfers | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| | Damaged Stock | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| | Stock Reports | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |

| **Customers** | View | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| | Create Customer | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| | Edit Customer | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| | Delete Customer | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | Credit Limit Change | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| | View Credit History | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |

| **Suppliers** | View | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| | Create Supplier | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| | Edit Supplier | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| | Delete Supplier | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

| **Quotations** | View | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| | Create Quotation | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| | Edit Quotation | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| | Delete Quotation | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | Convert to Invoice | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| | Approve Quotation | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

| **Accounts** | View Ledger | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| | Journal Entries | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| | Trial Balance | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| | P&L Statement | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| | Balance Sheet | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| | Bank Reconciliation | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

| **Reports** | Sales Reports | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| | Inventory Reports | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| | Financial Reports | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| | Staff Performance | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| | Export All Reports | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

| **Staff Management** | View Staff | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| | Create Staff | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | Edit Staff | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | Delete Staff | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | Reset Passwords | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | Change Roles | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | View Activity Logs | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

| **Settings** | System Settings | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | Branch Settings | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | Tax Settings | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| | User Permissions | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | Backup/Restore | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

| **Branches** | Manage All Branches | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | Manage Assigned Branch | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| | Branch Reports | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## UI Screens & Design

### Screen 1: Staff Login Page
