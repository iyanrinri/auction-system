# API Documentation - NestJS Auction System

## Base URL
```
http://localhost:3000
```

## Authentication
Sistem menggunakan JWT (JSON Web Token) untuk autentikasi. Setelah login, token harus disertakan dalam header `Authorization` dengan format `Bearer <token>`.

---

## 🔐 Authentication Endpoints

### 1. Register User
**POST** `/auth/register`

Mendaftarkan user baru ke sistem.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "role": "USER" // USER, SELLER, ADMIN
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "password123",
    "name": "John Doe",
    "role": "USER"
  }'
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "john.doe@example.com",
    "name": "John Doe",
    "role": "USER",
    "createdAt": "2025-11-02T10:00:00.000Z"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2. Login User
**POST** `/auth/login`

Login user dan mendapatkan JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "password123"
  }'
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "john.doe@example.com",
    "name": "John Doe",
    "role": "USER"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 👤 User Endpoints

### 1. Get User Profile
**GET** `/users/profile`

Mendapatkan profil user yang sedang login.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**cURL Example:**
```bash
curl -X GET http://localhost:3000/users/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response:**
```json
{
  "id": "uuid",
  "email": "john.doe@example.com",
  "name": "John Doe",
  "role": "USER",
  "createdAt": "2025-11-02T10:00:00.000Z",
  "modifiedAt": "2025-11-02T10:00:00.000Z"
}
```

---

## 📦 Items Endpoints

### 1. Create Item (Seller Only)
**POST** `/items`

Membuat item baru untuk dijual.

**Headers:**
```
Authorization: Bearer <seller_jwt_token>
```

**Request Body:**
```json
{
  "title": "Vintage Watch",
  "description": "Beautiful vintage watch from 1950s",
  "metadata": {
    "category": "accessories",
    "condition": "excellent",
    "brand": "Rolex"
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/items \
  -H "Authorization: Bearer <seller_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Vintage Watch",
    "description": "Beautiful vintage watch from 1950s",
    "metadata": {
      "category": "accessories",
      "condition": "excellent",
      "brand": "Rolex"
    }
  }'
```

**Response:**
```json
{
  "id": "uuid",
  "title": "Vintage Watch",
  "description": "Beautiful vintage watch from 1950s",
  "metadata": {
    "category": "accessories",
    "condition": "excellent",
    "brand": "Rolex"
  },
  "sellerId": "seller_uuid",
  "createdAt": "2025-11-02T10:00:00.000Z"
}
```

### 2. Get All Items
**GET** `/items`

Mendapatkan daftar semua item dengan pagination dan filter.

**Query Parameters:**
- `page` (optional): Nomor halaman (default: 1)
- `limit` (optional): Jumlah item per halaman (default: 10)
- `search` (optional): Pencarian berdasarkan title/description
- `category` (optional): Filter berdasarkan kategori

**cURL Example:**
```bash
# Basic request
curl -X GET http://localhost:3000/items

# With pagination and filters
curl -X GET "http://localhost:3000/items?page=1&limit=5&search=watch&category=accessories"
```

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "title": "Vintage Watch",
      "description": "Beautiful vintage watch from 1950s",
      "metadata": {
        "category": "accessories",
        "condition": "excellent"
      },
      "sellerId": "seller_uuid",
      "seller": {
        "name": "Seller Name",
        "email": "seller@example.com"
      },
      "createdAt": "2025-11-02T10:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

### 3. Get Item by ID
**GET** `/items/:id`

Mendapatkan detail item berdasarkan ID.

**cURL Example:**
```bash
curl -X GET http://localhost:3000/items/item-uuid-here
```

### 4. Update Item (Seller Only)
**PATCH** `/items/:id`

Update item yang dimiliki seller.

**Headers:**
```
Authorization: Bearer <seller_jwt_token>
```

**Request Body:**
```json
{
  "title": "Updated Vintage Watch",
  "description": "Updated description"
}
```

**cURL Example:**
```bash
curl -X PATCH http://localhost:3000/items/item-uuid-here \
  -H "Authorization: Bearer <seller_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Vintage Watch",
    "description": "Updated description"
  }'
```

### 5. Delete Item (Seller Only)
**DELETE** `/items/:id`

Menghapus item yang dimiliki seller.

**Headers:**
```
Authorization: Bearer <seller_jwt_token>
```

**cURL Example:**
```bash
curl -X DELETE http://localhost:3000/items/item-uuid-here \
  -H "Authorization: Bearer <seller_token>"
```

---

## 🏆 Auctions Endpoints

### 1. Create Auction (Seller Only)
**POST** `/api/v1/auctions`

Membuat auction baru untuk item.

**Headers:**
```
Authorization: Bearer <seller_jwt_token>
```

**Request Body:**
```json
{
  "itemId": "item-uuid",
  "startingPrice": 100,
  "reservePrice": 200,
  "buyNowPrice": 500,
  "minIncrement": 10,
  "startAt": "2025-11-03T09:00:00.000Z",
  "endAt": "2025-11-03T18:00:00.000Z",
  "autoExtendSeconds": 300
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/v1/auctions \
  -H "Authorization: Bearer <seller_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "itemId": "item-uuid-here",
    "startingPrice": 100,
    "reservePrice": 200,
    "buyNowPrice": 500,
    "minIncrement": 10,
    "startAt": "2025-11-03T09:00:00.000Z",
    "endAt": "2025-11-03T18:00:00.000Z",
    "autoExtendSeconds": 300
  }'
```

**Response:**
```json
{
  "id": "auction-uuid",
  "itemId": "item-uuid",
  "startingPrice": 100,
  "reservePrice": 200,
  "buyNowPrice": 500,
  "minIncrement": 10,
  "startAt": "2025-11-03T09:00:00.000Z",
  "endAt": "2025-11-03T18:00:00.000Z",
  "status": "PENDING",
  "autoExtendSeconds": 300,
  "createdAt": "2025-11-02T10:00:00.000Z"
}
```

### 2. Get All Auctions (Public)
**GET** `/api/v1/auctions`

Mendapatkan daftar auction dengan filter dan pagination. **Route ini public dan tidak memerlukan authentication.**

**Query Parameters:**
- `q` (optional): Search query untuk title/description
- `status` (optional): Filter berdasarkan status (PENDING, RUNNING, ENDED, CANCELLED)
- `sellerId` (optional): Filter berdasarkan seller ID
- `minPrice` (optional): Filter harga minimum
- `maxPrice` (optional): Filter harga maksimum
- `page` (optional): Nomor halaman (default: 1)
- `limit` (optional): Jumlah auction per halaman (default: 10)
- `sortBy` (optional): Field untuk sorting (createdAt, startAt, endAt, startingPrice)
- `sortOrder` (optional): Urutan sort (ASC, DESC)

**cURL Example:**
```bash
# Basic request (No authentication needed)
curl -X GET "http://localhost:3000/api/v1/auctions"

# With filters
curl -X GET "http://localhost:3000/api/v1/auctions?status=RUNNING&page=1&limit=5"

# Search auctions
curl -X GET "http://localhost:3000/api/v1/auctions?q=watch&minPrice=100&maxPrice=1000"
```

**Response:**
```json
{
  "auctions": [
    {
      "id": "auction-uuid",
      "startingPrice": 100,
      "reservePrice": 200,
      "buyNowPrice": 500,
      "minIncrement": 10,
      "startAt": "2025-11-03T09:00:00.000Z",
      "endAt": "2025-11-03T18:00:00.000Z",
      "status": "RUNNING",
      "item": {
        "id": "item-uuid",
        "title": "Vintage Watch",
        "description": "Beautiful vintage watch"
      },
      "currentBid": {
        "amount": 150,
        "bidder": {
          "name": "Bidder Name"
        }
      },
      "bidsCount": 5,
      "createdAt": "2025-11-02T10:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

### 3. Get Auction by ID (Public)
**GET** `/api/v1/auctions/:id`

Mendapatkan detail auction beserta bids. **Route ini public dan tidak memerlukan authentication.**

**cURL Example:**
```bash
# No authentication needed
curl -X GET "http://localhost:3000/api/v1/auctions/auction-uuid-here"
```

**Response:**
```json
{
  "id": "auction-uuid",
  "startingPrice": 100,
  "reservePrice": 200,
  "buyNowPrice": 500,
  "status": "RUNNING",
  "item": {
    "id": "item-uuid",
    "title": "Vintage Watch",
    "description": "Beautiful vintage watch",
    "seller": {
      "name": "Seller Name"
    }
  },
  "bids": [
    {
      "id": "bid-uuid",
      "amount": 150,
      "isAuto": false,
      "bidder": {
        "name": "Bidder Name"
      },
      "createdAt": "2025-11-02T11:00:00.000Z"
    }
  ],
  "createdAt": "2025-11-02T10:00:00.000Z"
}
```

### 4. Update Auction (Seller Only)
**PATCH** `/api/v1/auctions/:id`

Update auction yang dimiliki seller.

**Headers:**
```
Authorization: Bearer <seller_jwt_token>
```

**Request Body:**
```json
{
  "buyNowPrice": 600,
  "endAt": "2025-11-03T20:00:00.000Z"
}
```

**cURL Example:**
```bash
curl -X PATCH http://localhost:3000/api/v1/auctions/auction-uuid-here \
  -H "Authorization: Bearer <seller_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "buyNowPrice": 600,
    "endAt": "2025-11-03T20:00:00.000Z"
  }'
```

### 5. Delete Auction (Seller Only)
**DELETE** `/api/v1/auctions/:id`

Menghapus auction yang belum dimulai.

**Headers:**
```
Authorization: Bearer <seller_jwt_token>
```

**cURL Example:**
```bash
curl -X DELETE http://localhost:3000/api/v1/auctions/auction-uuid-here \
  -H "Authorization: Bearer <seller_token>"
```

---

## 💰 Bids Endpoints

### 1. Place Bid (Authenticated User)
**POST** `/api/v1/bids`

Menempatkan bid pada auction yang sedang berjalan.

**Headers:**
```
Authorization: Bearer <user_jwt_token>
```

**Request Body:**
```json
{
  "auctionId": "auction-uuid",
  "amount": 200,
  "isAuto": false
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/v1/bids \
  -H "Authorization: Bearer <user_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "auctionId": "auction-uuid-here",
    "amount": 200,
    "isAuto": false
  }'
```

**Response:**
```json
{
  "id": "bid-uuid",
  "auctionId": "auction-uuid",
  "bidderId": "user-uuid",
  "amount": 200,
  "isAuto": false,
  "createdAt": "2025-11-02T12:00:00.000Z",
  "auction": {
    "id": "auction-uuid",
    "item": {
      "title": "Vintage Watch"
    }
  }
}
```

### 2. Get All Bids (Public - No Auth Required)
**GET** `/api/v1/bids`

Mendapatkan daftar semua bids dengan filter dan pagination. **Route ini public dan tidak memerlukan authentication.**

**Query Parameters:**
- `page` (optional): Nomor halaman (default: 1)
- `limit` (optional): Jumlah bid per halaman (default: 10)
- `auctionId` (optional): Filter berdasarkan auction ID
- `bidderId` (optional): Filter berdasarkan bidder ID
- `sortBy` (optional): Field untuk sorting: `createdAt` | `amount` (default: createdAt)
- `sortOrder` (optional): Urutan sorting: `ASC` | `DESC` (default: DESC)

**cURL Example:**
```bash
# Basic request (no auth required)
curl http://localhost:3000/api/v1/bids

# Filter by auction
curl "http://localhost:3000/api/v1/bids?auctionId=auction-uuid-here&page=1&limit=10"

# Sort by amount descending
curl "http://localhost:3000/api/v1/bids?sortBy=amount&sortOrder=DESC"
```

**Response:**
```json
{
  "bids": [
    {
      "id": "bid-uuid",
      "amount": 200,
      "isAuto": false,
      "createdAt": "2025-11-02T12:00:00.000Z",
      "auction": {
        "id": "auction-uuid",
        "item": {
          "title": "Vintage Watch"
        }
      },
      "bidder": {
        "name": "Bidder Name"
      }
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

### 3. Get Bids by Auction ID (Public - No Auth Required)
**GET** `/api/v1/bids/auction/:auctionId`

Mendapatkan semua bids untuk auction tertentu. **Route ini public dan tidak memerlukan authentication.**

**cURL Example:**
```bash
curl http://localhost:3000/api/v1/bids/auction/auction-uuid-here
```

### 4. Get Highest Bid (Public - No Auth Required)
**GET** `/api/v1/bids/auction/:auctionId/highest`

Mendapatkan bid tertinggi untuk auction tertentu. **Route ini public dan tidak memerlukan authentication.**

**cURL Example:**
```bash
curl http://localhost:3000/api/v1/bids/auction/auction-uuid-here/highest
```

### 5. Get Bid by ID (Public - No Auth Required)
**GET** `/api/v1/bids/:id`

Mendapatkan detail bid berdasarkan ID. **Route ini public dan tidak memerlukan authentication.**

**cURL Example:**
```bash
curl http://localhost:3000/api/v1/bids/bid-uuid-here
```

### 6. Get User's Bids (Authenticated User)
**GET** `/api/v1/bids/my-bids`

Mendapatkan semua bid yang dibuat oleh user yang sedang login.

**Headers:**
```
Authorization: Bearer <user_jwt_token>
```

**cURL Example:**
```bash
curl http://localhost:3000/api/v1/bids/my-bids \
  -H "Authorization: Bearer <user_token>"
```

---

## 🏷️ User Roles & Permissions

### USER
- ✅ Place bids on auctions
- ✅ View auctions and items
- ✅ View own bid history
- ❌ Create items or auctions

### SELLER
- ✅ All USER permissions
- ✅ Create, update, delete items
- ✅ Create, update, delete auctions
- ✅ View auction performance

### ADMIN
- ✅ All SELLER permissions
- ✅ Manage all users
- ✅ Moderate auctions and bids
- ✅ System administration

---

## 📊 Response Status Codes

| Code | Description |
|------|-------------|
| 200  | OK - Request successful |
| 201  | Created - Resource created successfully |
| 400  | Bad Request - Invalid request data |
| 401  | Unauthorized - Missing or invalid authentication |
| 403  | Forbidden - Insufficient permissions |
| 404  | Not Found - Resource not found |
| 409  | Conflict - Resource already exists |
| 422  | Unprocessable Entity - Validation error |
| 500  | Internal Server Error - Server error |

---

## 🔄 Auction Status Flow

```
PENDING → RUNNING → ENDED
    ↓        ↓
CANCELLED  CANCELLED
```

- **PENDING**: Auction belum dimulai
- **RUNNING**: Auction sedang berjalan, menerima bids
- **ENDED**: Auction selesai
- **CANCELLED**: Auction dibatalkan

---

## 📝 Error Response Format

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    {
      "field": "amount",
      "message": "Amount must be greater than current highest bid"
    }
  ]
}
```

---

## 🌐 WebSocket Events

Sistem mendukung real-time updates melalui WebSocket untuk notifikasi langsung saat ada perubahan pada auction.

### Connection Setup

**Namespace:** `/auctions`  
**URL:** `ws://localhost:3000/auctions`

**Authentication:**
WebSocket connection memerlukan JWT token untuk autentikasi.

**JavaScript/TypeScript Example:**
```javascript
import io from 'socket.io-client';

// Connect to WebSocket server with authentication
const socket = io('http://localhost:3000/auctions', {
  auth: {
    token: 'your-jwt-token-here'
  }
});

// Connection event handlers
socket.on('connect', () => {
  console.log('Connected to WebSocket server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from WebSocket server');
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});
```

### Client Events (Emit)

#### 1. Join Auction Room
Join a specific auction room to receive real-time updates.

```javascript
socket.emit('joinAuction', 'auction-uuid-here');
```

#### 2. Leave Auction Room
Leave an auction room when you no longer need updates.

```javascript
socket.emit('leaveAuction', 'auction-uuid-here');
```

### Server Events (Listen)

#### 1. New Bid Placed
Triggered when a new bid is placed on an auction.

**Event:** `newBid`

```javascript
socket.on('newBid', (data) => {
  console.log('New bid placed:', data);
  // Update UI with new bid information
});
```

**Payload:**
```json
{
  "auctionId": "auction-uuid",
  "bid": {
    "id": "bid-uuid",
    "amount": 250,
    "bidderId": "user-uuid",
    "bidderName": "John Doe",
    "isAuto": false,
    "createdAt": "2025-11-02T12:30:00.000Z"
  },
  "timestamp": "2025-11-02T12:30:00.000Z"
}
```

#### 2. Price Update
Triggered when auction price changes (current highest bid).

**Event:** `priceUpdate`

```javascript
socket.on('priceUpdate', (data) => {
  console.log('Price updated:', data);
  // Update price display
});
```

**Payload:**
```json
{
  "auctionId": "auction-uuid",
  "currentPrice": 250,
  "bidCount": 15,
  "timestamp": "2025-11-02T12:30:00.000Z"
}
```

#### 3. Auction Status Change
Triggered when auction status changes (PENDING → RUNNING → ENDED).

**Event:** `statusChange`

```javascript
socket.on('statusChange', (data) => {
  console.log('Status changed:', data);
  // Update auction status UI
});
```

**Payload:**
```json
{
  "auctionId": "auction-uuid",
  "status": "RUNNING",
  "data": {
    "startedAt": "2025-11-02T09:00:00.000Z"
  },
  "timestamp": "2025-11-02T09:00:00.000Z"
}
```

#### 4. Auction Ending Soon
Triggered at specific intervals before auction ends (5min, 2min, 1min).

**Event:** `endingSoon`

```javascript
socket.on('endingSoon', (data) => {
  console.log('Auction ending soon:', data);
  // Show urgency notification
});
```

**Payload:**
```json
{
  "auctionId": "auction-uuid",
  "timeRemainingSeconds": 300,
  "timestamp": "2025-11-02T17:55:00.000Z"
}
```

#### 5. Viewer Count Update
Triggered when someone joins or leaves an auction room.

**Event:** `viewerCount`

```javascript
socket.on('viewerCount', (data) => {
  console.log('Active viewers:', data);
  // Update viewer count badge
});
```

**Payload:**
```json
{
  "auctionId": "auction-uuid",
  "count": 42
}
```

### Complete Integration Example

```javascript
import io from 'socket.io-client';

class AuctionWebSocket {
  constructor(token) {
    this.socket = io('http://localhost:3000/auctions', {
      auth: { token }
    });
    
    this.setupEventHandlers();
  }
  
  setupEventHandlers() {
    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ Connected to auction server');
    });
    
    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from auction server');
    });
    
    // Auction events
    this.socket.on('newBid', this.handleNewBid.bind(this));
    this.socket.on('priceUpdate', this.handlePriceUpdate.bind(this));
    this.socket.on('statusChange', this.handleStatusChange.bind(this));
    this.socket.on('endingSoon', this.handleEndingSoon.bind(this));
    this.socket.on('viewerCount', this.handleViewerCount.bind(this));
  }
  
  joinAuction(auctionId) {
    this.socket.emit('joinAuction', auctionId);
    console.log(`📍 Joined auction: ${auctionId}`);
  }
  
  leaveAuction(auctionId) {
    this.socket.emit('leaveAuction', auctionId);
    console.log(`👋 Left auction: ${auctionId}`);
  }
  
  handleNewBid(data) {
    console.log('💰 New bid:', data);
    // Update UI with new bid
    const bidElement = document.getElementById('current-bid');
    if (bidElement) {
      bidElement.textContent = `$${data.bid.amount}`;
      bidElement.classList.add('pulse-animation');
    }
  }
  
  handlePriceUpdate(data) {
    console.log('📈 Price update:', data);
    // Update price and bid count
    const priceElement = document.getElementById('auction-price');
    const countElement = document.getElementById('bid-count');
    
    if (priceElement) priceElement.textContent = `$${data.currentPrice}`;
    if (countElement) countElement.textContent = `${data.bidCount} bids`;
  }
  
  handleStatusChange(data) {
    console.log('🔄 Status changed:', data);
    // Update auction status badge
    const statusElement = document.getElementById('auction-status');
    if (statusElement) {
      statusElement.textContent = data.status;
      statusElement.className = `status-badge ${data.status.toLowerCase()}`;
    }
  }
  
  handleEndingSoon(data) {
    console.log('⏰ Auction ending soon:', data);
    // Show countdown and urgency notification
    const minutes = Math.floor(data.timeRemainingSeconds / 60);
    const seconds = data.timeRemainingSeconds % 60;
    
    const notification = document.getElementById('ending-notification');
    if (notification) {
      notification.textContent = `⚠️ Ending in ${minutes}:${seconds.toString().padStart(2, '0')}!`;
      notification.classList.add('show', 'urgent');
    }
  }
  
  handleViewerCount(data) {
    console.log('👥 Viewers:', data);
    // Update viewer count
    const viewersElement = document.getElementById('viewers-count');
    if (viewersElement) {
      viewersElement.textContent = `${data.count} watching`;
    }
  }
  
  disconnect() {
    this.socket.disconnect();
  }
}

// Usage
const token = localStorage.getItem('jwt_token');
const auctionSocket = new AuctionWebSocket(token);

// Join specific auction
auctionSocket.joinAuction('auction-uuid-here');

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  auctionSocket.disconnect();
});
```

### React Hook Example

```typescript
import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

interface BidData {
  auctionId: string;
  bid: {
    id: string;
    amount: number;
    bidderName: string;
    createdAt: string;
  };
  timestamp: string;
}

export const useAuctionSocket = (auctionId: string, token: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentBid, setCurrentBid] = useState<number>(0);
  const [bidCount, setBidCount] = useState<number>(0);
  const [viewers, setViewers] = useState<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    // Connect to WebSocket
    const newSocket = io('http://localhost:3000/auctions', {
      auth: { token }
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('joinAuction', auctionId);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('newBid', (data: BidData) => {
      setCurrentBid(data.bid.amount);
    });

    newSocket.on('priceUpdate', (data) => {
      setCurrentBid(data.currentPrice);
      setBidCount(data.bidCount);
    });

    newSocket.on('viewerCount', (data) => {
      setViewers(data.count);
    });

    setSocket(newSocket);

    // Cleanup
    return () => {
      if (newSocket) {
        newSocket.emit('leaveAuction', auctionId);
        newSocket.disconnect();
      }
    };
  }, [auctionId, token]);

  return { socket, currentBid, bidCount, viewers, isConnected };
};
```

### Vue.js Composable Example

```typescript
import { ref, onMounted, onUnmounted } from 'vue';
import io, { Socket } from 'socket.io-client';

export function useAuctionSocket(auctionId: string, token: string) {
  const socket = ref<Socket | null>(null);
  const currentBid = ref<number>(0);
  const bidCount = ref<number>(0);
  const viewers = ref<number>(0);
  const isConnected = ref<boolean>(false);

  onMounted(() => {
    socket.value = io('http://localhost:3000/auctions', {
      auth: { token }
    });

    socket.value.on('connect', () => {
      isConnected.value = true;
      socket.value?.emit('joinAuction', auctionId);
    });

    socket.value.on('disconnect', () => {
      isConnected.value = false;
    });

    socket.value.on('newBid', (data) => {
      currentBid.value = data.bid.amount;
    });

    socket.value.on('priceUpdate', (data) => {
      currentBid.value = data.currentPrice;
      bidCount.value = data.bidCount;
    });

    socket.value.on('viewerCount', (data) => {
      viewers.value = data.count;
    });
  });

  onUnmounted(() => {
    if (socket.value) {
      socket.value.emit('leaveAuction', auctionId);
      socket.value.disconnect();
    }
  });

  return { currentBid, bidCount, viewers, isConnected };
}
```

---

## 📚 Additional Resources

- [Testing Documentation](./TESTING.md)
- [Setup Instructions](./README.md)
- [Database Schema](./src/database/entities/)
- [Environment Configuration](./.env.example)

---

## 🚀 Quick Start Example

```bash
# 1. Register as seller
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"seller@test.com","password":"123456","name":"Test Seller","role":"SELLER"}'

# 2. Login and get token
TOKEN=$(curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"seller@test.com","password":"123456"}' | jq -r '.access_token')

# 3. Create item
ITEM_ID=$(curl -X POST http://localhost:3000/items \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Item","description":"Test Description"}' | jq -r '.id')

# 4. Create auction
curl -X POST http://localhost:3000/auctions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"itemId\":\"$ITEM_ID\",\"startingPrice\":100,\"endAt\":\"$(date -u -v+1H +%Y-%m-%dT%H:%M:%S.000Z)\"}"

# 5. View auctions
curl -X GET http://localhost:3000/auctions
```

---

*Dokumentasi ini akan terus diupdate seiring dengan pengembangan fitur baru.*