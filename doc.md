# ZOMATO CLONE — FINAL FRONTEND DEVELOPMENT SPECIFICATION

# Version

V1 Production Frontend

# Objective

Build the complete frontend ecosystem for a food delivery platform.

Frontend Systems:

1. Customer Mobile App (React Native)
2. Rider Mobile App (React Native)
3. Restaurant Panel (Next.js)
4. Admin Panel (Next.js)

All systems use:

* Same Backend APIs
* Same Socket Server
* Same Database
* Same Authentication System

---

# DEVELOPMENT ORDER

Phase F1 → Frontend Foundation

Phase F2 → Customer Mobile Application

Phase F3 → Customer Checkout & Orders

Phase F4 → Customer Realtime Tracking

Phase F5 → Rider Mobile Application

Phase F6 → Restaurant Dashboard

Phase F7 → Admin Dashboard

Phase F8 → Notifications

Phase F9 → QA & Testing

Phase F10 → Production Release

---

# PHASE F1 — FRONTEND FOUNDATION

Goal:
Create reusable frontend infrastructure.

## Create Projects

customer-mobile/

rider-mobile/

restaurant-panel/

admin-panel/

---

## Shared Libraries

Axios

React Query

Redux Toolkit

Redux Persist

Socket.io Client

Zod

React Hook Form

---

## API Layer

Create:

apiClient

authInterceptor

refreshTokenHandler

errorHandler

retryHandler

---

## Global Types

User

Restaurant

MenuCategory

MenuItem

Cart

Order

Coupon

Payment

Wallet

Notification

Rider

Address

SupportTicket

Analytics

---

## Socket Layer

Create:

SocketProvider

SocketHook

SocketContext

SocketEvents

---

## Theme System

Colors

Typography

Spacing

Icons

Dark Mode Support

---

# PHASE F2 — CUSTOMER MOBILE APPLICATION

Platform:

React Native

---

## Authentication Module

Screens:

Splash

Onboarding

Login

Register

OTP Verification

Forgot Password

Reset Password

---

## Home Module

Screens:

Home

Search

Restaurant Listing

Restaurant Details

Food Details

---

## User Module

Screens:

Profile

Edit Profile

Addresses

Favorites

Notifications

Settings

Wallet

Support

---

## Home Screen Sections

Current Location

Search Bar

Categories

Offers Banner

Popular Restaurants

Nearby Restaurants

Recommended Foods

Fast Delivery Section

Trending Section

---

## Restaurant Details Screen

Restaurant Header

Rating

Delivery Time

Cuisine Tags

Offers

Categories

Menu Items

Favorite Button

Restaurant Information

---

## Food Details Modal

Food Image

Description

Addons

Quantity Selector

Price

Nutrition

Add To Cart

---

# PHASE F3 — CUSTOMER CHECKOUT & ORDERS

---

## Cart Module

Screens:

Cart

Coupon Selection

---

Features:

Add Item

Remove Item

Update Quantity

Apply Coupon

Price Calculation

---

## Checkout Module

Screens:

Checkout

Address Selection

Payment Selection

---

Features:

Delivery Address

Delivery Instructions

Wallet Usage

Coupon Summary

Order Summary

---

## Payment Module

Integration:

Razorpay

---

Flow:

Create Order

Create Razorpay Order

Open Checkout

Verify Payment

Success Response

---

## Orders Module

Screens:

Order Success

Order History

Order Details

---

Features:

Order Timeline

Invoice

Refund Request

Reorder

Rate Order

---

# PHASE F4 — CUSTOMER REALTIME TRACKING

---

## Tracking Screen

Features:

Live Map

Restaurant Marker

Customer Marker

Rider Marker

ETA

Status Timeline

Call Rider

Support

---

## Socket Events

order_created

order_confirmed

order_updated

rider_assigned

rider_location_update

order_delivered

---

## Maps Features

Google Maps

Route Drawing

Realtime Marker Updates

ETA Calculation

---

# PHASE F5 — RIDER MOBILE APPLICATION

Platform:

React Native

---

## Rider Authentication

Screens:

Login

Register

OTP

KYC Upload

---

## Rider Home

Features:

Online Toggle

Available Orders

Current Delivery

Daily Earnings

Performance Metrics

---

## Delivery Assignment Flow

Receive Order Request

Accept Delivery

Reject Delivery

Assignment Confirmation

---

## Active Delivery Flow

Navigate To Restaurant

Pickup Food

Navigate To Customer

Verify OTP

Complete Delivery

---

## Rider Screens

Home

Active Delivery

Map Screen

Delivery Details

Earnings

History

Profile

Notifications

---

## Rider Realtime

Sockets

GPS Tracking

Location Sync

Assignment Notifications

---

## Rider Earnings

Today Earnings

Weekly Earnings

Monthly Earnings

Completed Deliveries

Payout History

---

# PHASE F6 — RESTAURANT DASHBOARD

Platform:

Next.js

---

## Authentication

Restaurant Login

Restaurant Staff Login

---

## Dashboard

Metrics:

Today's Orders

Revenue

Customers

Ratings

---

## Order Management

Screens:

Incoming Orders

Order Details

Active Orders

Completed Orders

Cancelled Orders

---

Actions:

Status Timeline (Restaurant should also see):

New Order

Accept

Reject

Preparing

Ready For Pickup

Rider Assigned

Picked Up

Delivered

---

## Menu Management

Categories

Items

Add Item

Edit Item

Delete Item

Availability Toggle

Addons

---

## Restaurant Analytics

Revenue

Orders

Best Sellers

Ratings

Delivery Metrics

---

## Restaurant Settings

Profile

Hours

Address

Bank Details

Open Close Toggle

---

## Restaurant Realtime

New Orders

Order Updates

Rider Arrival Updates

---

# PHASE F7 — ADMIN DASHBOARD

Platform:

Next.js

---

## Admin Authentication

Admin Login

---

## Dashboard

Widgets:

Users

Restaurants

Orders

Revenue

Refunds

Support Tickets

Riders

Audit Logs

---

## User Management

Customers

Restaurant Owners

Riders

Admins

---

Actions:

View

Block

Unblock

Delete

---

## Restaurant Approvals

Pending

Approved

Rejected

---

Actions:

Approve

Reject

---

## Rider Approvals

Pending

Approved

Rejected

---

Actions:

Approve

Reject

---

## Order Management

All Orders

Cancelled Orders

Refund Orders

Failed Payments

---

## Refund Monitoring

Refund Requests

Refund Status (pending / processed / failed)

Refund Audit Trail

---

## Support Management

Tickets

Replies

Refund Requests

Escalations

---

## Audit Logs

Admin Actions

Refund Actions

User Block/Unblock

Restaurant/Rider Approvals

Order Cancel / Overrides

---

## Analytics

Sales

Orders

Users

Delivery

Revenue

Growth

---

# PHASE F8 — NOTIFICATIONS

Customer Notifications

Order Updates

Offers

Refund Updates

---

Rider Notifications

Delivery Requests

Payout Updates

---

Restaurant Notifications

New Orders

Status Changes

---

Admin Notifications

Approval Requests

Critical Alerts

---

# PHASE F9 — QA TESTING

---

Customer App

Authentication

Search

Cart

Payments

Tracking

Orders

---

Rider App

Assignments

GPS

OTP

Deliveries

---

Restaurant Dashboard

Orders

Menu

Analytics

---

Admin Dashboard

Approvals

Support

Reports

---

# PHASE F10 — PRODUCTION RELEASE

---

Android Build

Play Store Submission

Privacy Policy

Terms & Conditions

App Icons

Splash Screens

---

Web Deployment

Restaurant Panel

Admin Panel

---

Infrastructure Verification

Backend

MongoDB

Redis

Sockets

Payments

Notifications

---

# FINAL DELIVERABLES

Customer Mobile App

Rider Mobile App

Restaurant Dashboard

Admin Dashboard

Razorpay Integration

Google Maps Integration

Realtime Tracking

Push Notifications

Wallet System

Coupon System

Support System

Analytics System

Production Ready Food Delivery Platform
