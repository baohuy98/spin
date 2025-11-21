# Technical Specification & Tasks - Team Random Picker

## Tổng quan dự án

Dự án Team Random Picker là một ứng dụng web real-time cho phép host tạo phòng, quay số ngẫu nhiên chọn thành viên, và chia sẻ màn hình cho các viewer xem trực tiếp thông qua WebRTC livestream.

---

## 🛠️ Technical Stack

### Frontend
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

### Real-time Communication Stack

#### 1. WebSocket (Socket.IO Client 4.8.1)
**Vai trò**: Quản lý signaling cho WebRTC và real-time room management

**Chức năng chính**:
- Room lifecycle management (create, join, leave)
- WebRTC signaling (offer, answer, ICE candidates)
- Broadcast spin results
- Member state synchronization

**Implementation**:
- Custom hook: [useSocket.ts](src/hooks/useSocket.ts)
- Transport modes: WebSocket + Polling fallback
- Backend URL: `http://localhost:3003`

**Events được sử dụng**:
```typescript
// Client → Server
- 'create-room': Tạo phòng mới
- 'join-room': Tham gia phòng
- 'leave-room': Rời khỏi phòng
- 'offer': Gửi WebRTC offer
- 'answer': Gửi WebRTC answer
- 'ice-candidate': Gửi ICE candidate
- 'spin-result': Broadcast kết quả quay số
- 'stop-sharing': Thông báo dừng chia sẻ màn hình
- 'host-ready-to-share': Host sẵn sàng chia sẻ

// Server → Client
- 'connect': Kết nối thành công
- 'disconnect': Mất kết nối
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
- 'error': Lỗi xảy ra
```

#### 2. WebRTC (Native Browser API)
**Vai trò**: Screen sharing và peer-to-peer video streaming

**Chức năng chính**:
- Screen capture từ host (getDisplayMedia)
- Multiple peer connections (1 host → N viewers)
- ICE candidate exchange
- Connection state monitoring

**Implementation**:
- Custom hook: [useWebRTC.ts](src/hooks/useWebRTC.ts)
- STUN servers: Google STUN servers
- Architecture: SFU-like (Single host → Multiple viewers)

**WebRTC Configuration**:
```typescript
{
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
}
```

**Connection Flow**:
1. Host starts screen share → getDisplayMedia()
2. Host creates RTCPeerConnection for each viewer
3. Host sends offer via Socket.IO
4. Viewer receives offer, creates answer
5. ICE candidates exchanged via Socket.IO
6. Media stream flows from host to viewers

---

## 📁 Cấu trúc Project

```
src/
├── hooks/
│   ├── useSocket.ts          # Socket.IO connection & room management
│   └── useWebRTC.ts          # WebRTC screen sharing logic
├── pages/
│   ├── Home.tsx              # Landing page - member selection
│   ├── host/
│   │   └── HostPage.tsx      # Host interface - spin wheel + screen share
│   └── viewer/
│       └── ViewerPage.tsx    # Viewer interface - watch stream
├── components/
│   ├── SpinWheel.tsx         # Random wheel component
│   ├── Header.tsx            # Navigation header
│   ├── ThemeProvider.tsx     # Theme context
│   └── ui/                   # Reusable UI components
├── utils/
│   ├── interface/
│   │   └── MemberInterface.ts
│   └── mock/
│       └── member-list/
│           └── memberList.ts  # Mock member data
└── App.tsx                    # Main app router
```

---

## 🎯 Core Features (Đã hoàn thành)

### ✅ Host Features
1. **Room Management**
   - Tạo phòng với unique room ID
   - QR code generation cho sharing
   - Copy room link/ID
   - Hiển thị danh sách members trong phòng

2. **Spin Wheel**
   - Random member selection
   - Customizable spin duration (2-10s)
   - Hide/show members from spinning
   - Shuffle và reset members
   - Broadcast kết quả cho viewers

3. **Screen Sharing**
   - Start/stop screen share
   - Preview local stream
   - Broadcast đến tất cả viewers
   - Auto-handle browser stop sharing

### ✅ Viewer Features
1. **Room Joining**
   - Join via room ID hoặc URL với query params
   - Auto-join khi có roomId trong URL
   - Member ID validation

2. **Live Stream Viewing**
   - Receive WebRTC stream từ host
   - Full-screen video display
   - Connection status indicator
   - Live indicator khi đang stream

3. **Spin Result Display**
   - Real-time notification khi host quay số
   - Animated result modal
   - Auto-dismiss after 5 seconds

---

## 🚀 Tasks & Roadmap

### Phase 1: Backend Development (CRITICAL - Chưa có)

#### Task 1.1: Socket.IO Server Setup
**Priority**: 🔴 HIGHEST
**Status**: ❌ Not Started

**Requirements**:
- [ ] Khởi tạo Node.js + Express server
- [ ] Cài đặt Socket.IO server (phiên bản tương thích với client 4.8.1)
- [ ] Configure CORS cho frontend origin
- [ ] Setup WebSocket transport + polling fallback
- [ ] Implement connection logging

**Tech Stack**:
```bash
npm install express socket.io cors
```

**File structure**:
```
backend/
├── server.js           # Entry point
├── socket/
│   ├── handlers/
│   │   ├── roomHandler.js    # Room CRUD
│   │   ├── webrtcHandler.js  # WebRTC signaling
│   │   └── spinHandler.js    # Spin events
│   └── middleware/
│       └── validation.js     # Input validation
└── models/
    └── Room.js         # Room data structure
```

**Key Implementation Points**:
```javascript
// Room data structure
{
  roomId: string,
  hostId: string,
  members: string[],
  createdAt: timestamp,
  isActive: boolean
}
```

#### Task 1.2: Room Management Events
**Priority**: 🔴 HIGH
**Status**: ❌ Not Started

**Requirements**:
- [ ] `create-room`: Tạo room với unique ID
- [ ] `join-room`: Thêm member vào room
- [ ] `leave-room`: Remove member, cleanup nếu host leave
- [ ] Broadcast `member-joined` và `member-left`
- [ ] Emit `room-created` và `room-joined` responses
- [ ] Handle room cleanup khi empty
- [ ] Error handling cho room không tồn tại

**Validation Rules**:
- Room ID: 6-10 ký tự alphanumeric
- Member ID: Không được trùng trong cùng room
- Host không thể join room khác khi đang host

#### Task 1.3: WebRTC Signaling Server
**Priority**: 🔴 HIGH
**Status**: ❌ Not Started

**Requirements**:
- [ ] Relay `offer` từ host → specific viewer
- [ ] Relay `answer` từ viewer → host
- [ ] Relay `ice-candidate` bidirectionally
- [ ] Handle `host-ready-to-share` event
- [ ] Broadcast `stop-sharing` đến tất cả viewers
- [ ] Emit `viewer-joined` đến host khi có viewer mới

**Signaling Flow**:
```
Host                Socket.IO Server         Viewer
 |                         |                    |
 |--offer (to: viewerId)-->|                    |
 |                         |----offer---------->|
 |                         |<---answer----------|
 |<--answer (from: viewer)-|                    |
 |--ice-candidate--------->|----ice-candidate-->|
 |<--ice-candidate---------|<--ice-candidate----|
```

#### Task 1.4: Spin Result Broadcasting
**Priority**: 🟡 MEDIUM
**Status**: ❌ Not Started

**Requirements**:
- [ ] Listen `spin-result` từ host
- [ ] Validate host authority (chỉ host mới được emit)
- [ ] Broadcast result đến tất cả viewers trong room
- [ ] Add timestamp cho mỗi spin result

#### Task 1.5: Production Deployment
**Priority**: 🟡 MEDIUM
**Status**: ❌ Not Started

**Requirements**:
- [ ] Environment variables config
- [ ] Deploy to Heroku/Railway/Render
- [ ] Configure production CORS
- [ ] Setup health check endpoint
- [ ] Add logging (Winston/Pino)
- [ ] Monitor WebSocket connections

---

### Phase 2: Frontend Enhancements

#### Task 2.1: Reconnection Handling
**Priority**: 🟡 MEDIUM
**Status**: ❌ Not Started

**Requirements**:
- [ ] Auto-reconnect khi mất kết nối Socket.IO
- [ ] Rejoin room sau khi reconnect
- [ ] Re-establish WebRTC connections
- [ ] Show reconnecting UI state
- [ ] Handle failed reconnection (redirect to home)

**Files to modify**:
- [useSocket.ts](src/hooks/useSocket.ts) - Add reconnection logic
- [useWebRTC.ts](src/hooks/useWebRTC.ts) - Handle peer connection recovery

#### Task 2.2: Error Handling & Validation
**Priority**: 🟡 MEDIUM
**Status**: ❌ Not Started

**Requirements**:
- [ ] Validate room ID format trước khi join
- [ ] Handle WebRTC permission denied
- [ ] Handle browser không support getDisplayMedia
- [ ] Toast notifications cho errors
- [ ] Graceful degradation khi WebRTC fails

#### Task 2.3: Chat & Comments Feature
**Priority**: 🔵 LOW
**Status**: ❌ Not Started (Placeholder đã có)

**Requirements**:
- [ ] Text chat interface cho viewers
- [ ] Real-time message broadcast
- [ ] Message persistence (optional)
- [ ] Emoji support
- [ ] Auto-scroll đến message mới

**Socket.IO Events**:
```typescript
// New events needed
- 'send-message': { roomId, userId, message, timestamp }
- 'new-message': Broadcast to all room members
```

**Files to modify**:
- [ViewerPage.tsx](src/pages/viewer/ViewerPage.tsx:214-226) - Implement chat UI
- Create new component: `LivesCommentView.tsx` (đã có file stub)

#### Task 2.4: Mobile Responsive Optimization
**Priority**: 🟡 MEDIUM
**Status**: ⚠️ Partially Done

**Requirements**:
- [ ] Optimize wheel size cho mobile
- [ ] Full-screen video mode cho viewers
- [ ] Touch-friendly controls
- [ ] Landscape mode handling
- [ ] Test trên iOS Safari và Android Chrome

#### Task 2.5: Performance Optimization
**Priority**: 🔵 LOW
**Status**: ❌ Not Started

**Requirements**:
- [ ] Lazy load components với React.lazy()
- [ ] Memoize expensive calculations
- [ ] Optimize re-renders với useMemo/useCallback
- [ ] Code splitting per route
- [ ] Compress video stream nếu cần

---

### Phase 3: Advanced Features

#### Task 3.1: TURN Server Integration
**Priority**: 🟡 MEDIUM
**Status**: ❌ Not Started

**Lý do**: STUN servers chỉ hoạt động khi cả host và viewer ở mạng public. Nếu có NAT/firewall phức tạp, cần TURN server để relay traffic.

**Requirements**:
- [ ] Setup TURN server (coturn hoặc Twilio TURN)
- [ ] Add TURN credentials vào WebRTC config
- [ ] Fallback logic: STUN → TURN
- [ ] Monitor connection success rate

**Updated WebRTC config**:
```typescript
{
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: 'turn:your-turn-server.com:3478',
      username: 'user',
      credential: 'pass'
    }
  ]
}
```

#### Task 3.2: Recording Feature
**Priority**: 🔵 LOW
**Status**: ❌ Not Started

**Requirements**:
- [ ] Record host screen share stream
- [ ] Save recording to server/cloud storage
- [ ] Download recording sau khi session kết thúc
- [ ] Video compression
- [ ] UI controls (start/stop recording)

**Tech Stack**:
- MediaRecorder API (frontend)
- Storage: AWS S3 / Cloudinary

#### Task 3.3: Multiple Host Screens
**Priority**: 🔵 LOW
**Status**: ❌ Not Started

**Requirements**:
- [ ] Support nhiều hosts cùng lúc trong 1 room
- [ ] Viewers chọn xem screen nào
- [ ] Grid layout cho multiple streams
- [ ] Bandwidth optimization

#### Task 3.4: Authentication & User Management
**Priority**: 🔵 LOW
**Status**: ❌ Not Started

**Requirements**:
- [ ] User login/registration
- [ ] JWT authentication
- [ ] Persistent user profiles
- [ ] History của spin results
- [ ] Private rooms với password

---

## 🔧 Known Issues & Bugs

### Issue 1: WebRTC Connection Failures
**Severity**: 🔴 HIGH
**Reproduction**:
- Xảy ra khi host và viewer ở sau strict NAT/firewall
- Connection state: `failed` hoặc stuck ở `connecting`

**Root Cause**:
- Chỉ dùng STUN servers, không có TURN server
- ICE candidates không thể traverse symmetric NAT

**Solution**: Implement Task 3.1 (TURN server)

---

### Issue 2: Race Condition - Viewer Join Before Host Ready
**Severity**: 🟡 MEDIUM
**Status**: ✅ Fixed ([useWebRTC.ts](src/hooks/useWebRTC.ts:22))

**Fix**: Implemented `pendingViewersRef` - track viewers và create peer connections khi host starts sharing

---

### Issue 3: Memory Leak - Peer Connections Not Closed
**Severity**: 🟡 MEDIUM
**Status**: ✅ Fixed ([useWebRTC.ts](src/hooks/useWebRTC.ts:281-295))

**Fix**: Cleanup peer connections trong useEffect return function

---

## 📊 Architecture Diagrams

### System Architecture
```
┌─────────────┐         WebSocket         ┌──────────────────┐
│   Host UI   │◄──────Signaling──────────►│  Socket.IO       │
│  (React)    │                            │  Server          │
└──────┬──────┘                            │  (Port 3003)     │
       │                                   └────────┬─────────┘
       │ WebRTC Media Stream                       │
       │ (Peer-to-Peer)                            │
       ▼                                            │
┌─────────────┐         WebSocket         ┌────────▼─────────┐
│  Viewer UI  │◄──────Signaling──────────►│  Signaling       │
│  (React)    │                            │  Relay           │
└─────────────┘                            └──────────────────┘
```

### WebRTC Connection Flow
```
Host                                    Viewer
 │                                         │
 │ 1. getDisplayMedia() ───────────────►  │
 │ 2. Create RTCPeerConnection            │
 │ 3. addTrack(stream)                    │
 │                                         │
 │ 4. createOffer() ──────Socket.IO────► │ 5. Receive offer
 │                                         │ 6. Create RTCPeerConnection
 │                                         │ 7. setRemoteDescription(offer)
 │                                         │ 8. createAnswer()
 │ 9. Receive answer ◄────Socket.IO────── │ 10. Send answer
 │ 11. setRemoteDescription(answer)       │
 │                                         │
 │ 12. ICE candidates ◄──Socket.IO─────► │ 13. ICE candidates
 │                                         │
 │ 14. Media stream flows ──────────────► │ 15. ontrack event
 │                                         │ 16. Display video
```

---

## 🧪 Testing Strategy

### Unit Tests
- [ ] useSocket hook - room lifecycle
- [ ] useWebRTC hook - peer connection management
- [ ] SpinWheel component - random selection logic

### Integration Tests
- [ ] End-to-end room creation → join → spin → result
- [ ] WebRTC screen share flow
- [ ] Error scenarios (network failures, invalid room ID)

### Manual Testing Checklist
- [ ] Test trên Chrome, Firefox, Safari
- [ ] Test trên mobile devices
- [ ] Test với multiple viewers (5-10 người)
- [ ] Test reconnection scenarios
- [ ] Test với different network conditions

---

## 📚 Documentation

### API Documentation (Backend - Cần tạo)
- [ ] Socket.IO events specification
- [ ] Error codes và meanings
- [ ] Rate limiting policies

### Developer Guide
- [ ] Setup instructions
- [ ] Environment variables
- [ ] Debugging WebRTC issues

### User Guide
- [ ] How to host a session
- [ ] How to join as viewer
- [ ] Troubleshooting common issues

---

## 🔒 Security Considerations

### Current Status: ⚠️ Development Only

**Issues cần fix trước production**:
1. **No Authentication**: Bất kỳ ai cũng có thể tạo/join room
2. **No Authorization**: Không verify host authority
3. **No Input Validation**: Room ID, member ID chưa được sanitize
4. **No Rate Limiting**: Có thể spam create rooms
5. **CORS**: Cần restrict origins trong production

**Security Tasks**:
- [ ] Implement JWT authentication
- [ ] Add room password protection
- [ ] Input sanitization và validation
- [ ] Rate limiting cho Socket.IO events
- [ ] Content Security Policy headers
- [ ] Encrypt sensitive data

---

## 💡 Best Practices & Conventions

### Code Style
- TypeScript strict mode
- ESLint + Prettier
- Functional components với hooks
- Custom hooks cho reusable logic

### Git Workflow
- Feature branches: `feature/task-name`
- Commit messages: Conventional Commits
- PR reviews required

### Performance
- Lazy load routes
- Optimize images và assets
- Minimize bundle size
- Monitor WebRTC bandwidth usage

---

## 📞 Support & Resources

### WebRTC Resources
- [WebRTC API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [STUN/TURN Server Guide](https://www.twilio.com/docs/stun-turn)

### Debugging Tools
- Chrome DevTools → WebRTC Internals (`chrome://webrtc-internals`)
- Socket.IO Admin UI
- Network tab cho WebSocket inspection

---

**Last Updated**: 2025-11-21
**Document Version**: 1.0
**Maintainer**: Development Team
