# Technical Specification & Tasks - Team Random Picker

## Tổng quan dự án

Dự án Team Random Picker là một ứng dụng web real-time cho phép host tạo phòng, quay số ngẫu nhiên chọn thành viên, và chia sẻ màn hình cho các viewer xem trực tiếp thông qua WebRTC livestream.

---

## 🛠️ Technical Stack

### Frontend (`FE-spin`)
- **Framework**: React 19.2.0 + TypeScript
- **Build Tool**: Vite 7.2.2
- **Routing**: React Router DOM 7.9.6
- **State Management**: React Hooks (useState, useEffect, useRef)
- **UI Library**:
  - Radix UI (Separator, Slot, Tooltip)
  - Tailwind CSS 4.1.17
  - Framer Motion 12.23.24 (Animations)
  - Lucide React (Icons)
- **Styling**: Tailwind CSS + CSS Variables
- **QR Code**: qrcode.react 4.2.0
- **Socket**: `socket.io-client` 4.8.1

### Backend (`BE-SPIN`)
- **Framework**: NestJS 11.0.1
- **Language**: TypeScript
- **Real-time**: `@nestjs/websockets`, `@nestjs/platform-socket.io`
- **Storage/Config**: Firebase Admin SDK 13.6.0
- **Testing**: Jest
- **Architecture**: Modular (RoomsModule, ChatModule)

### Real-time Communication Stack

#### 1. WebSocket (Socket.IO)
**Vai trò**: Quản lý signaling cho WebRTC, chat, và real-time room management.

**Chức năng chính**:
- Room lifecycle management (create, join, leave, validate)
- WebRTC signaling (offer, answer, ICE candidates)
- Broadcast spin results
- Member state synchronization
- Chat & Reactions
- Reconnection handling (Grace period)

**Implementation**:
- **Frontend**: [useSocket.ts](src/hooks/useSocket.ts)
- **Backend**: 
  - [RoomsGateway](src/rooms/rooms.gateway.ts)
  - [ChatGateway](src/chat/chat.gateway.ts)

**Events Flow**:
```typescript
// Client → Server
- 'create-room': Tạo phòng mới
- 'join-room': Tham gia phòng
- 'leave-room': Rời khỏi phòng
- 'validate-room': Kiểm tra phòng tồn tại
- 'offer': Gửi WebRTC offer
- 'answer': Gửi WebRTC answer
- 'ice-candidate': Gửi ICE candidate
- 'spin-result': Broadcast kết quả quay số
- 'stop-sharing': Thông báo dừng chia sẻ màn hình
- 'host-ready-to-share': Host sẵn sàng chia sẻ
- 'request-stream': Viewer yêu cầu stream
- 'send-message': Gửi tin nhắn chat
- 'react-to-message': Thả reaction tin nhắn
- 'livestream-reaction': Thả tim/emoji livestream
- 'update-theme': Đổi theme phòng

// Server → Client
- 'room-created': Phòng được tạo
- 'room-joined': Tham gia phòng thành công
- 'member-joined': Thành viên mới tham gia
- 'member-left': Thành viên rời phòng
- 'viewer-joined': Viewer mới tham gia (host only)
- 'offer': Nhận WebRTC offer
- 'answer': Nhận WebRTC answer
- 'ice-candidate': Nhận ICE candidate
- 'spin-result': Nhận kết quả quay số
- 'stop-sharing': Host dừng chia sẻ
- 'existing-viewers': Danh sách viewer hiện tại (cho host reconnect)
- 'host-reconnected': Host đã kết nối lại
- 'chat-message': Tin nhắn mới
- 'chat-history': Lịch sử tin nhắn
- 'message-reaction-updated': Cập nhật reaction
- 'theme-updated': Cập nhật theme
```

#### 2. WebRTC (Native Browser API)
**Vai trò**: Screen sharing và peer-to-peer video streaming.

**Implementation**:
- **Frontend**: [useWebRTC.ts](src/hooks/useWebRTC.ts)
- **Signaling**: Via Socket.IO events (offer, answer, ice-candidate)

---

## 📁 Cấu trúc Project

### Frontend (`FE-spin`)
```
src/
├── hooks/
│   ├── useSocket.ts          # Socket.IO connection & room management
│   └── useWebRTC.ts          # WebRTC screen sharing logic
├── pages/
│   ├── Home.tsx              # Landing page
│   ├── host/HostPage.tsx     # Host interface
│   └── viewer/ViewerPage.tsx # Viewer interface
├── components/
│   ├── SpinWheel.tsx         # Random wheel component
│   ├── Header.tsx            # Navigation header
│   └── ...
└── utils/
```

### Backend (`BE-SPIN`)
```
src/
├── app.module.ts             # Main module
├── rooms/
│   ├── rooms.gateway.ts      # WebSocket gateway for rooms
│   ├── rooms.module.ts
│   ├── services/             # Business logic
│   └── dto/                  # Data Transfer Objects
├── chat/
│   ├── chat.gateway.ts       # WebSocket gateway for chat
│   ├── chat.module.ts
│   └── entities/             # Chat entities
└── config/                   # Configuration (Firebase, etc.)
```

---

## 🎯 Core Features Status

### ✅ Completed Features
1.  **Backend Infrastructure**
    -   NestJS Server Setup
    -   Socket.IO Gateway Implementation
    -   CORS Configuration
    -   Firebase Integration

2.  **Room Management**
    -   Create/Join/Leave Room
    -   Room Validation
    -   Member Synchronization
    -   Graceful Disconnection Handling (5s grace period)

3.  **Real-time Communication**
    -   WebRTC Signaling (Offer/Answer/ICE)
    -   Screen Sharing (Host → Viewers)
    -   Reconnection Logic (Host & Viewer recovery)

4.  **Interactive Features**
    -   Spin Wheel & Result Broadcasting
    -   Real-time Chat
    -   Message Reactions
    -   Livestream Reactions (Floating emojis)
    -   Theme Synchronization

### 🚀 Pending / In Progress

#### Phase 3: Advanced Features & Optimization

**Task 3.1: Production Deployment**
- [ ] Environment variables config for Production
- [ ] Deploy Backend (Render/Railway)
- [ ] Deploy Frontend (Vercel/Netlify)
- [ ] Setup Production CORS

**Task 3.2: TURN Server Integration**
- **Priority**: 🟡 MEDIUM
- **Reason**: Fix connection issues behind strict firewalls/NAT.
- [ ] Setup TURN server (Coturn or Twilio)
- [ ] Update `useWebRTC.ts` config

**Task 3.3: Recording Feature**
- **Priority**: 🔵 LOW
- [ ] Record host screen share
- [ ] Save to cloud storage

**Task 3.4: Security Hardening**
- [ ] Rate limiting for Socket events
- [ ] Input validation (DTO validation is partially in place)
- [ ] Room password protection (Optional)

---

## 🔧 Known Issues & Bugs

### Issue 1: WebRTC Connection Failures (Strict NAT)
- **Root Cause**: Lack of TURN server.
- **Solution**: Implement Task 3.2.

---

## 🧪 Testing Strategy

### Backend
- **Unit Tests**: Jest tests for Services and Gateways.
- **E2E Tests**: Socket.IO connection tests.

### Frontend
- **Manual Testing**:
    -   Chrome/Safari/Firefox compatibility.
    -   Mobile responsiveness.
    -   Reconnection flows (Network throttle, Tab close/reopen).

---

**Last Updated**: 2025-11-26
**Document Version**: 2.0
