
export interface Product {
  id: string;
  productCode: string;
  name: string;
  price: number;
  category: string;
  description: string;
  imageUrl: string;
  createdAt: number;
}

export interface Category {
  id: string;
  name: string;
}

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  supportId?: string;
  buttonText?: string;
  contactMessage?: string;
  welcomeMessage?: string; // New field for Dashboard Welcome message
}

export interface TelegramLog {
  id: string;
  productName: string;
  sentAt: number;
  status: 'SUCCESS' | 'FAILED';
  details?: string;
}

export interface BotInfo {
  id: number;
  first_name: string;
  username: string;
}

export interface VerifiedUser {
  userId: number;
  firstName: string;
  lastName?: string;
  username?: string;
  phoneNumber: string;
  verifiedAt: number;
}

export interface User {
  username: string;
  password: string;
  fullName: string;
  role?: 'ADMIN' | 'EDITOR';
  isVerified?: boolean;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  PRODUCTS = 'PRODUCTS',
  CATEGORIES = 'CATEGORIES',
  TELEGRAM = 'TELEGRAM',
  ORDERS = 'ORDERS'
}

export type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  priceAtTime: number;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone?: string;
  totalAmount: number;
  status: OrderStatus;
  items: OrderItem[];
  createdAt: number;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details?: string;
  timestamp: number;
}