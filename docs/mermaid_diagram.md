## 3. USER FLOW DIAGRAMS
### 3.1 Host Creates Room & Starts Sharing (Mediasoup)

```mermaid
flowchart TD
    Start([Host Opens App]) --> Login[Enter Name]
    Login --> ClickHost[Click 'Host a Room']
    ClickHost --> Navigate1[Navigate to /host]
    Navigate1 --> CreateRoom[emit: create-room]
    CreateRoom --> ServerCreate{Server: Create Room}

    ServerCreate -->|Existing Room| Reconnect[Reconnect Flow]
    ServerCreate -->|New Room| NewRoom[Generate Room ID]

    Reconnect --> CleanupOld[Cleanup Old Socket<br/>Close Old Producers]
    CleanupOld --> ReusRoom[Reuse Room Data]

    NewRoom --> SaveRoom[Save to Repository]
    SaveRoom --> EmitCreated[emit: room-created]
    ReusRoom --> EmitCreated

    EmitCreated --> HostReceive[Host Receives room-created]
    HostReceive --> DisplayRoom[Display Room Info + QR Code]
    DisplayRoom --> WaitAction{Host Action?}

    WaitAction -->|Share Screen| GetDisplay[getDisplayMedia]
    GetDisplay --> LocalStream[Set Local Stream]
    LocalStream --> InitDevice[Initialize Mediasoup Device]
    InitDevice --> GetRTP[emit: getRouterRtpCapabilities]
    GetRTP --> LoadDevice[device.load RTP capabilities]
    LoadDevice --> CreateSendTransport[emit: createTransport direction=send]
    CreateSendTransport --> ProduceMedia[Produce Video/Audio Tracks]
    ProduceMedia --> BroadcastProducer[Server: emit newProducer to viewers]

    WaitAction -->|Spin Wheel| SpinWheel[Spin Animation]
    WaitAction -->|Change Theme| ChangeTheme[emit: update-theme]
    WaitAction -->|Leave Room| LeaveRoom[emit: leave-room]

    LeaveRoom --> DeleteRoom[Server Deletes Room]
    DeleteRoom --> NotifyViewers[emit: room-deleted to all]
    NotifyViewers --> End([Room Closed])
```

### 3.2 Viewer Joins Room & Watches Stream (Mediasoup)

```mermaid
flowchart TD
    Start([Viewer Opens App]) --> Login[Enter Name]
    Login --> EnterRoomId[Enter Room ID / Scan QR]
    EnterRoomId --> Validate[emit: validate-room]
    Validate --> ServerValidate{Server: Check Room Exists}

    ServerValidate -->|Not Exist| ShowError[Show Error: Room not found]
    ShowError --> EnterRoomId

    ServerValidate -->|Exists| ClickJoin[Click 'Join Room']
    ClickJoin --> Navigate[Navigate to /viewer]
    Navigate --> EmitJoin[emit: join-room]
    EmitJoin --> ServerJoin{Server: Handle Join}

    ServerJoin -->|Duplicate Name| RejectName[Reject: Name taken]
    ServerJoin -->|Reconnecting| CancelDisconnect[Cancel Grace Period]
    ServerJoin -->|In Other Room| LeaveOld[Leave Old Room First]

    RejectName --> ShowNameError[Show Error]
    ShowNameError --> Login

    CancelDisconnect --> UpdateSocket[Update Socket Mapping]
    LeaveOld --> UpdateSocket
    ServerJoin -->|New Join| UpdateSocket

    UpdateSocket --> AddMember[Add to room.members]
    AddMember --> EmitJoined[emit: room-joined to viewer]
    EmitJoined --> BroadcastJoin[emit: member-joined to others]

    BroadcastJoin --> ViewerReceive[Viewer Receives room-joined]
    ViewerReceive --> DisplayStream[Display Stream Area]
    DisplayStream --> InitDevice[Initialize Mediasoup Device]
    InitDevice --> GetRTP[emit: getRouterRtpCapabilities]
    GetRTP --> LoadDevice[device.load RTP capabilities]
    LoadDevice --> CheckProducers[emit: getProducers]

    CheckProducers --> WaitStream{Host Sharing?}

    WaitStream -->|Yes| ReceiveProducers[Receive: producers list]
    WaitStream -->|No| WaitForHost[Wait for newProducer event]

    ReceiveProducers --> CreateRecvTransport[emit: createTransport direction=recv]
    CreateRecvTransport --> ConsumeEach[For each producer: consume]
    ConsumeEach --> ShowVideo[Display Video Stream]

    WaitForHost --> NewProducerEvent[Receive: newProducer event]
    NewProducerEvent --> CreateRecvTransport

    ShowVideo --> ViewerActions{Viewer Action?}

    ViewerActions -->|Send Chat| SendMessage[emit: send-message]
    ViewerActions -->|React| SendReaction[emit: livestream-reaction]
    ViewerActions -->|Leave Room| LeaveRoom[emit: leave-room]

    LeaveRoom --> ServerLeave[Server: Remove from Room]
    ServerLeave --> BroadcastLeft[emit: member-left to others]
    BroadcastLeft --> End([Left Room])

    ViewerActions -->|Host Left| ReceiveDeleted[Receive: room-deleted]
    ReceiveDeleted --> ShowToast[Show: Host left the room]
    ShowToast --> Redirect[Redirect to Home]
    Redirect --> End
```

### 3.3 Mediasoup Screen Sharing Flow (Detailed)

```mermaid
flowchart TD
    Start([Host Starts Sharing]) --> GetDisplay[navigator.mediaDevices<br/>.getDisplayMedia]
    GetDisplay --> SetLocal[localStreamRef.current = stream<br/>setLocalStream, setIsSharing=true]

    SetLocal --> CheckDevice{Device Ready?}
    CheckDevice -->|No| GetRtp[emit: getRouterRtpCapabilities]
    GetRtp --> ServerRtp[Server: createRouter if needed]
    ServerRtp --> ReceiveRtp[Receive: routerRtpCapabilities]
    ReceiveRtp --> LoadDevice[device = new Device<br/>device.load rtpCapabilities]

    CheckDevice -->|Yes| CreateTransport
    LoadDevice --> CreateTransport[emit: createTransport<br/>direction: send]

    CreateTransport --> ServerTransport[Server: router.createWebRtcTransport<br/>transportId = socketId-send]
    ServerTransport --> ReceiveParams[Receive: transportCreated<br/>iceParameters, dtlsParameters]
    ReceiveParams --> DeviceTransport[device.createSendTransport]

    DeviceTransport --> SetupListeners[Setup transport listeners:<br/>on connect, on produce]
    SetupListeners --> ProduceTrack[sendTransport.produce track]

    ProduceTrack --> OnConnect[Event: transport.on connect]
    OnConnect --> EmitConnect[emit: connectTransport<br/>dtlsParameters]
    EmitConnect --> ServerConnect[Server: transport.connect]
    ServerConnect --> ConnectCallback[callback - connected]

    ConnectCallback --> OnProduce[Event: transport.on produce]
    OnProduce --> EmitProduce[emit: produce<br/>kind, rtpParameters]
    EmitProduce --> ServerProduce[Server: transport.produce]
    ServerProduce --> SaveProducer[roomRouter.producers.set<br/>producer.id, producer]
    SaveProducer --> ReceiveProduced[Receive: produced<br/>producerId]
    ReceiveProduced --> ProduceCallback[callback producerId]
    ProduceCallback --> StoreProducer[producersRef.set kind, producer]

    StoreProducer --> BroadcastNew[Server: emit newProducer<br/>to all viewers in room]

    BroadcastNew --> ViewerReceive[Viewer: on newProducer]
    ViewerReceive --> ViewerCheckDevice{Viewer Device Ready?}

    ViewerCheckDevice -->|No| ViewerGetRtp[Viewer: getRouterRtpCapabilities]
    ViewerGetRtp --> ViewerLoadDevice[Viewer: device.load]

    ViewerCheckDevice -->|Yes| ViewerCheckTransport{Has RecvTransport?}
    ViewerLoadDevice --> ViewerCheckTransport

    ViewerCheckTransport -->|No| ViewerCreateTransport[Viewer: createTransport<br/>direction: recv]
    ViewerCreateTransport --> ViewerServerTransport[Server: createWebRtcTransport<br/>socketId-recv]
    ViewerServerTransport --> ViewerReceiveParams[Viewer: transportCreated]
    ViewerReceiveParams --> ViewerDeviceTransport[Viewer: device.createRecvTransport]

    ViewerCheckTransport -->|Yes| EmitConsume[Viewer: emit consume<br/>producerId, rtpCapabilities]
    ViewerDeviceTransport --> EmitConsume

    EmitConsume --> ServerConsume[Server: router.canConsume check<br/>transport.consume paused=true]
    ServerConsume --> SaveConsumer[roomRouter.consumers.set<br/>consumer.id, consumer]
    SaveConsumer --> ReceiveConsumed[Viewer: consumed event<br/>id, producerId, kind, rtpParameters]
    ReceiveConsumed --> DeviceConsume[Viewer: recvTransport.consume]
    DeviceConsume --> StoreConsumer[consumersRef.set consumerId]
    StoreConsumer --> AddTrack[Add consumer.track to remoteStream]
    AddTrack --> EmitResume[Viewer: emit resumeConsumer]
    EmitResume --> ServerResume[Server: consumer.resume]
    ServerResume --> GetTrack[Viewer: setRemoteStream]
    GetTrack --> ShowVideo[Viewer: video displays]

    ShowVideo --> End([Streaming Active])
```

### 3.4 Disconnect & Reconnection Flow

```mermaid
flowchart TD
    Start([User Disconnects]) --> Event[Socket.IO: disconnect event]
    Event --> ServerDetect[Server: handleDisconnect]
    ServerDetect --> FindUser[Find userId by socketId]
    FindUser --> CheckRoom{User in Room?}

    CheckRoom -->|No| Cleanup[Delete from loggedInUsers]
    Cleanup --> End1([Disconnected])

    CheckRoom -->|Yes| StartTimer[Start Grace Period<br/>5 seconds]
    StartTimer --> SavePending[pendingDisconnects.set<br/>userId, timeout]

    SavePending --> WaitTimer{Wait for Timer}

    WaitTimer -->|User Reconnects| NewConnect[New Socket Connection]
    NewConnect -->|Host| EmitCreate[emit: create-room]
    NewConnect -->|Viewer| EmitJoin[emit: join-room]

    EmitCreate --> ServerCheckExisting{Existing Room?}
    ServerCheckExisting -->|Yes| FindOldSocket[Find Old Socket ID]
    FindOldSocket --> CheckSame{Same Socket?}

    CheckSame -->|No| CleanupOld[Cleanup Old Media<br/>mediasoupService.cleanupUserMedia<br/>Close Producers, emit producerClosed]
    CleanupOld --> DisconnectOld[Disconnect Old Socket]
    DisconnectOld --> CancelTimer[cancelPendingDisconnect]

    CheckSame -->|Yes| CancelTimer
    ServerCheckExisting -->|No| CancelTimer

    CancelTimer --> UpdateMapping[Update Socket Mappings]
    UpdateMapping --> EmitReconnected[emit: room-created /<br/>room-joined]
    EmitReconnected --> Success([Reconnected])

    WaitTimer -->|Timer Expires| ProcessDisconnect[processUserDisconnect]
    ProcessDisconnect --> VerifyNoReconnect{User Reconnected?}
    VerifyNoReconnect -->|Yes| AlreadyHandled([Already Handled])

    VerifyNoReconnect -->|No| HandleDisconnect[handleUserDisconnect]
    HandleDisconnect --> CallLeaveRoom[Call: leaveRoom]
    CallLeaveRoom --> CheckHost{Is Host?}

    CheckHost -->|Yes| DeleteRoom[Delete Room]
    DeleteRoom --> CleanupViewers[Remove All Viewers]
    CleanupViewers --> CloseMediasoup[mediasoupService.closeRoom<br/>Close all consumers, producers,<br/>transports, router]
    CloseMediasoup --> BroadcastDeleted[emit: room-deleted]
    BroadcastDeleted --> End2([Room Deleted])

    CheckHost -->|No| RemoveFromRoom[Remove from room.members]
    RemoveFromRoom --> BroadcastLeft[emit: member-left]
    BroadcastLeft --> DeleteMappings[Delete Socket/Room Mappings]
    DeleteMappings --> End3([User Removed])
```

---

## 4. TECHNICAL FLOW - METHOD CALLS

### 4.1 Host Creates Room - Complete Method Call Sequence

```mermaid
sequenceDiagram
    participant Home as Home.tsx
    participant HostPage as HostPage.tsx
    participant Socket as useSocket Hook
    participant Server as RoomsGateway
    participant Service as RoomsService
    participant Repo as RoomsRepository

    Home->>Home: handleHostRoom()
    Home->>HostPage: navigate("/host", { state: member })

    HostPage->>HostPage: useEffect mount
    HostPage->>Socket: socket.emit('create-room', {hostId, name})

    Socket->>Server: WS: create-room
    Server->>Server: @SubscribeMessage('create-room')<br/>handleCreateRoom(client, data)
    Server->>Repo: getUserRoom(hostId)

    alt Host Already Has Room
        Server->>Repo: getUserSocket(hostId)
        Server->>Service: mediasoupService.cleanupUserMedia(roomId, oldSocketId)
        Service-->>Server: closedProducerIds[]
        Server->>Server: server.to(roomId).emit('producerClosed', {producerId})
        Server->>Server: server.sockets.sockets.get(oldSocketId)?.disconnect()
    end

    Server->>Service: createRoom(hostId, name)
    Service->>Service: generateRoomId(hostId)
    Note over Service: roomId = SHA256('room-' + hostId)<br/>.substring(0, 12)
    Service->>Repo: findById(roomId)

    alt Room Exists (Reconnection)
        Service->>Repo: updateRoom(roomId, members)
    else New Room
        Service->>Repo: create(new Room)
    end

    Service-->>Server: { roomId, hostId, members, ... }

    Server->>Repo: setUserSocket(hostId, socketId)
    Server->>Repo: setUserRoom(hostId, roomId)
    Server->>Repo: setLoggedInUser(hostId, {genID, name, roomId, socketId})
    Server->>Server: client.join(roomId)
    Server->>Socket: client.emit('room-created', roomData)

    Socket->>HostPage: on('room-created', data)
    HostPage->>HostPage: setRoomData(data)
    HostPage->>HostPage: Display Room Info + QR Code
```

### 4.2 Viewer Joins Room - Complete Method Call Sequence

```mermaid
sequenceDiagram
    participant Home as Home.tsx
    participant ViewerPage as ViewerPage.tsx
    participant Socket as useSocket Hook
    participant Server as RoomsGateway
    participant Service as RoomsService
    participant Repo as RoomsRepository

    Home->>Home: handleJoinRoom()
    Home->>ViewerPage: navigate(`/viewer?roomId=${roomId}`, {state: member})

    ViewerPage->>ViewerPage: useEffect mount
    ViewerPage->>Socket: socket.emit('join-room', {roomId, memberId, name})

    Socket->>Server: WS: join-room
    Server->>Server: @SubscribeMessage('join-room')<br/>handleJoinRoom(client, data)
    Server->>Service: validateRoom(roomId)
    Service->>Repo: findById(roomId)
    Service-->>Server: room exists check

    alt Room Not Found
        Server->>Socket: client.emit('error', {message: 'Room not found'})
        Socket->>ViewerPage: Show error
    end

    Server->>Repo: getUserRoom(memberId)

    alt User Already in THIS Room
        Server->>Server: cancelPendingDisconnect(memberId)
        Server->>Repo: getUserSocket(memberId)

        alt Different Socket (Reconnecting)
            Server->>Server: server.sockets.sockets.get(oldSocketId)?.disconnect()
            Server->>Repo: setUserSocket(memberId, newSocketId)
            Server->>Service: joinRoom(roomId, memberId, name)
            Note over Service: Add memberId to room.members if needed
        end
    else User in Different Room
        Server->>Service: leaveRoom(oldRoomId, memberId)
        Service->>Repo: removeMemberFromRoom(oldRoomId, memberId)
        Server->>Server: client.to(oldRoomId).emit('member-left', {memberId})
        Server->>Repo: deleteUserRoom(memberId)
    end

    Server->>Service: joinRoom(roomId, memberId, name)
    Service->>Repo: findById(roomId)
    Service->>Service: Check duplicate name

    alt Duplicate Name (Not Reconnecting)
        Service-->>Server: throw error
        Server->>Socket: client.emit('error', {message: 'Name taken'})
    end

    Service->>Repo: addMemberToRoom(roomId, memberId)
    Service-->>Server: { roomId, members, ... }

    Server->>Repo: setUserSocket(memberId, socketId)
    Server->>Repo: setUserRoom(memberId, roomId)
    Server->>Repo: setLoggedInUser(memberId, {genID, name, roomId, socketId})
    Server->>Server: client.join(roomId)

    Server->>Socket: client.emit('room-joined', roomData)
    Server->>Server: client.to(roomId).emit('member-joined', memberData)

    Socket->>ViewerPage: on('room-joined', data)
    ViewerPage->>ViewerPage: setRoomData(data)
    ViewerPage->>ViewerPage: Display Stream Area
```

### 4.3 Host Starts Screen Share (Mediasoup) - Complete Sequence

```mermaid
sequenceDiagram
    participant HostPage as HostPage.tsx
    participant Hook as useMediasoupWebRTC
    participant Socket as Socket.IO Client
    participant Server as RoomsGateway
    participant Mediasoup as MediasoupService
    participant Worker as Mediasoup Worker
    participant ViewerPage as ViewerPage.tsx
    participant ViewerHook as Viewer: useMediasoupWebRTC

    Note over HostPage,Worker: PHASE 1: INITIALIZATION

    HostPage->>Hook: startScreenShare() called
    Hook->>Hook: navigator.mediaDevices.getDisplayMedia()
    Hook->>Hook: localStreamRef.current = stream
    Hook->>Hook: setLocalStream(stream), setIsSharing(true)
    Hook->>Socket: socket.emit('getRouterRtpCapabilities', {roomId})

    Socket->>Server: WS: getRouterRtpCapabilities
    Server->>Server: handleGetRouterRtpCapabilities()
    Server->>Mediasoup: createRouter(roomId)

    alt Router Doesn't Exist
        Mediasoup->>Worker: worker.createRouter({ mediaCodecs })
        Worker-->>Mediasoup: router
        Mediasoup->>Mediasoup: routers.set(roomId, {<br/>  router, transports, producers, consumers<br/>})
    end

    Mediasoup-->>Server: routerRtpCapabilities
    Server->>Socket: client.emit('routerRtpCapabilities', data)
    Socket->>Hook: on('routerRtpCapabilities', data)
    Hook->>Hook: const device = new Device()
    Hook->>Hook: await device.load({ routerRtpCapabilities })
    Hook->>Hook: deviceRef.current = device

    Note over HostPage,Worker: PHASE 2: CREATE SEND TRANSPORT

    Hook->>Socket: socket.emit('createTransport', {roomId, direction: 'send'})
    Socket->>Server: WS: createTransport
    Server->>Server: handleCreateTransport(client, data)
    Server->>Mediasoup: createWebRtcTransport(roomId, transportId)

    Mediasoup->>Mediasoup: transportId = `${socketId}-send`
    Mediasoup->>Worker: router.createWebRtcTransport({<br/>  listenIps, enableUdp, enableTcp, ...<br/>})
    Worker-->>Mediasoup: transport
    Mediasoup->>Mediasoup: roomRouter.transports.set(transportId, transport)
    Mediasoup-->>Server: { id, iceParameters, iceCandidates, dtlsParameters }

    Server->>Socket: client.emit('transportCreated', {<br/>  direction: 'send', transportId, ...params<br/>})
    Socket->>Hook: on('transportCreated', data)
    Hook->>Hook: device.createSendTransport(params)
    Hook->>Hook: sendTransportRef.current = transport
    Hook->>Hook: sendTransportIdRef.current = data.transportId

    Hook->>Hook: transport.on('connect', ({dtlsParameters}, callback) => {<br/>  emit('connectTransport')<br/>})
    Hook->>Hook: transport.on('produce', ({kind, rtpParameters}, callback) => {<br/>  emit('produce')<br/>})

    Note over HostPage,Worker: PHASE 3: PRODUCE MEDIA

    Hook->>Hook: await produceMedia(localStream)
    Hook->>Hook: sendTransport.produce({ track: videoTrack })
    Note over Hook: This triggers 'connect' event first

    Hook->>Socket: socket.emit('connectTransport', {<br/>  roomId, transportId, dtlsParameters<br/>})
    Socket->>Server: WS: connectTransport
    Server->>Server: handleConnectTransport()
    Server->>Mediasoup: connectTransport(roomId, transportId, dtlsParameters)
    Mediasoup->>Mediasoup: transport = roomRouter.transports.get(transportId)
    Mediasoup->>Worker: await transport.connect({ dtlsParameters })
    Worker-->>Mediasoup: connected
    Mediasoup-->>Server: success
    Server->>Socket: client.emit('transportConnected', {transportId})
    Socket->>Hook: callback() in 'connect' handler

    Note over Hook: After transport connected, 'produce' event fires

    Hook->>Socket: socket.emit('produce', {<br/>  roomId, transportId, kind, rtpParameters<br/>})
    Socket->>Server: WS: produce
    Server->>Server: handleProduce(client, data)
    Server->>Mediasoup: produce(roomId, transportId, kind, rtpParameters)

    Mediasoup->>Mediasoup: transport = roomRouter.transports.get(transportId)
    Mediasoup->>Worker: producer = await transport.produce({<br/>  kind, rtpParameters<br/>})
    Worker-->>Mediasoup: producer (id, kind, rtpParameters)
    Mediasoup->>Mediasoup: roomRouter.producers.set(producer.id, producer)
    Mediasoup-->>Server: producer.id

    Server->>Socket: client.emit('produced', {kind, id: producer.id})
    Socket->>Hook: callback(producer.id) in 'produce' handler
    Hook->>Hook: producersRef.current.set(kind, producer)

    Server->>ViewerPage: server.to(roomId).emit('newProducer', {<br/>  producerId, kind<br/>})

    Note over HostPage,Worker: PHASE 4: VIEWER CONSUMES

    ViewerPage->>ViewerHook: on('newProducer', {producerId, kind})

    alt Viewer Doesn't Have RecvTransport
        ViewerHook->>Socket: socket.emit('createTransport', {<br/>  roomId, direction: 'recv'<br/>})
        Socket->>Server: WS: createTransport
        Server->>Mediasoup: createWebRtcTransport(roomId, `${viewerSocketId}-recv`)
        Mediasoup->>Worker: router.createWebRtcTransport(...)
        Worker-->>Mediasoup: recvTransport
        Server->>Socket: client.emit('transportCreated', {<br/>  direction: 'recv', ...<br/>})
        Socket->>ViewerHook: device.createRecvTransport(params)
        ViewerHook->>ViewerHook: recvTransportRef.current = transport
        ViewerHook->>ViewerHook: recvTransportIdRef.current = data.transportId
    end

    ViewerHook->>Socket: socket.emit('consume', {<br/>  roomId, transportId, producerId, rtpCapabilities<br/>})
    Socket->>Server: WS: consume
    Server->>Server: handleConsume(client, data)
    Server->>Mediasoup: consume(roomId, transportId, producerId, rtpCapabilities)

    Mediasoup->>Mediasoup: router.canConsume({ producerId, rtpCapabilities })

    alt Can't Consume
        Mediasoup-->>Server: throw error
        Server->>Socket: client.emit('error', {message})
    end

    Mediasoup->>Mediasoup: transport = roomRouter.transports.get(transportId)
    Mediasoup->>Worker: consumer = await transport.consume({<br/>  producerId, rtpCapabilities, paused: true<br/>})
    Worker-->>Mediasoup: consumer (id, producerId, kind, rtpParameters)
    Mediasoup->>Mediasoup: roomRouter.consumers.set(consumer.id, consumer)
    Mediasoup-->>Server: { id, producerId, kind, rtpParameters }

    Server->>Socket: client.emit('consumed', {<br/>  id, producerId, kind, rtpParameters<br/>})
    Socket->>ViewerHook: on('consumed', data)
    ViewerHook->>ViewerHook: consumer = await recvTransport.consume(params)
    ViewerHook->>ViewerHook: consumersRef.current.set(data.id, consumer)
    ViewerHook->>ViewerHook: Add consumer.track to remoteStream
    ViewerHook->>ViewerHook: setRemoteStream(stream)

    ViewerHook->>Socket: socket.emit('resumeConsumer', {<br/>  roomId, consumerId<br/>})
    Socket->>Server: WS: resumeConsumer
    Server->>Mediasoup: resumeConsumer(roomId, consumerId)
    Mediasoup->>Worker: consumer.resume()
    Worker-->>Mediasoup: resumed
    Server->>Socket: client.emit('consumerResumed', {consumerId})

    ViewerHook->>ViewerPage: Video displays in <video srcObject={remoteStream} />
```

### 4.4 Leave Room - Complete Method Call Sequence

```mermaid
sequenceDiagram
    participant Page as ViewerPage / HostPage
    participant Socket as Socket.IO Client
    participant Server as RoomsGateway
    participant Service as RoomsService
    participant Repo as RoomsRepository
    participant Mediasoup as MediasoupService
    participant Others as Other Members

    Page->>Page: handleLeaveRoom() clicked
    Page->>Socket: socket.emit('leave-room', {roomId, memberId})

    Socket->>Server: WS: leave-room
    Server->>Server: @SubscribeMessage('leave-room')<br/>handleLeaveRoom(client, data)
    Server->>Service: leaveRoom(roomId, memberId)
    Service->>Repo: findById(roomId)

    alt Room Not Found
        Service-->>Server: return { roomId, members: [], roomDeleted: false }
    end

    Service->>Service: const isHost = (memberId === room.hostId)

    alt Member is Host
        Note over Service,Repo: DELETE ENTIRE ROOM

        Service->>Service: for each viewerId in room.members
        Service->>Repo: deleteUserSocket(viewerId)
        Service->>Repo: deleteUserRoom(viewerId)
        Service->>Repo: deleteLoggedInUser(viewerId)

        Service->>Repo: deleteAllMessages(roomId)
        Service->>Repo: deleteRoom(roomId)
        Service-->>Server: { roomId, members: [], roomDeleted: true }

        Server->>Mediasoup: closeRoom(roomId)
        Mediasoup->>Mediasoup: roomRouter = routers.get(roomId)
        Mediasoup->>Mediasoup: for each consumer: consumer.close()
        Mediasoup->>Mediasoup: for each producer: producer.close()
        Mediasoup->>Mediasoup: for each transport: transport.close()
        Mediasoup->>Mediasoup: router.close()
        Mediasoup->>Mediasoup: routers.delete(roomId)

        Server->>Others: server.to(roomId).emit('member-left', {<br/>  memberId, members: [], ...<br/>})
        Server->>Others: server.to(roomId).emit('room-deleted', {<br/>  message: 'Host left'<br/>})

    else Member is Viewer
        Note over Service,Repo: REMOVE MEMBER ONLY

        Service->>Repo: removeMemberFromRoom(roomId, memberId)
        Repo->>Repo: room.members = room.members.filter(id !== memberId)
        Service-->>Server: { roomId, members: updatedMembers, roomDeleted: false }

        Server->>Others: client.to(roomId).emit('member-left', {<br/>  memberId, members, ...<br/>})
    end

    Server->>Repo: deleteUserSocket(memberId)
    Server->>Repo: deleteUserRoom(memberId)
    Server->>Repo: deleteLoggedInUser(memberId)
    Server->>Server: client.leave(roomId)

    alt Room Deleted
        Others->>Others: on('room-deleted', data)
        Others->>Others: toast.error('Host has left the room')
        Others->>Others: navigate('/')
    else Member Left
        Others->>Others: on('member-left', data)
        Others->>Others: Update member list UI
    end

    Page->>Page: navigate('/')
```

### 4.5 Disconnect & Grace Period - Complete Sequence

```mermaid
sequenceDiagram
    participant Browser as Browser
    participant Socket as Socket.IO
    participant Server as RoomsGateway
    participant Repo as RoomsRepository
    participant Service as RoomsService
    participant Mediasoup as MediasoupService

    Note over Browser,Mediasoup: USER DISCONNECTS (Network issue / Page close)

    Browser->>Socket: Connection lost
    Socket->>Server: disconnect event
    Server->>Server: handleDisconnect(client)
    Server->>Repo: getUserIdBySocketId(client.id)

    alt User Not Found
        Server->>Server: return (no action)
    end

    Server->>Repo: getUserRoom(userId)

    alt User Not in Room
        Server->>Repo: deleteLoggedInUser(userId)
        Server->>Server: return
    end

    Server->>Server: const timeoutId = setTimeout(() => {<br/>  processUserDisconnect(userId, roomId)<br/>}, 5000)
    Server->>Server: pendingDisconnects.set(userId, timeoutId)
    Note over Server: GRACE PERIOD: 5 seconds

    alt SCENARIO A: User Reconnects Within 5 Seconds
        Browser->>Socket: Reconnect (new connection)
        Socket->>Server: New socket connected
        Browser->>Server: emit('create-room') or emit('join-room')

        Server->>Server: handleCreateRoom / handleJoinRoom
        Server->>Repo: getUserRoom(userId)
        Note over Server: Existing room found!

        Server->>Repo: getUserSocket(userId)
        Note over Server: oldSocketId found

        alt Old Socket != New Socket (Reconnection)
            Server->>Server: cancelPendingDisconnect(userId)
            Server->>Server: const timeoutId = pendingDisconnects.get(userId)
            Server->>Server: clearTimeout(timeoutId)
            Server->>Server: pendingDisconnects.delete(userId)
            Note over Server: GRACE PERIOD CANCELLED

            alt User is Host
                Server->>Mediasoup: cleanupUserMedia(roomId, oldSocketId)
                Note over Mediasoup: Close producers for old socket<br/>transports.forEach((t) => {<br/>  if (t.id.startsWith(oldSocketId)) close()<br/>})
                Server->>Server: server.to(roomId).emit('producerClosed', {producerId})
            end

            Server->>Server: server.sockets.sockets.get(oldSocketId)?.disconnect()
            Server->>Repo: setUserSocket(userId, newSocketId)
            Server->>Socket: emit('room-created') or emit('room-joined')
            Note over Server,Socket: USER SUCCESSFULLY RECONNECTED
        end
    end

    alt SCENARIO B: Grace Period Expires (5 seconds passed)
        Server->>Server: setTimeout callback fires
        Server->>Server: processUserDisconnect(userId, roomId)
        Server->>Repo: getUserSocket(userId)

        alt User Already Reconnected (Different Socket)
            Note over Server: User reconnected with different socket,<br/>already handled
            Server->>Server: pendingDisconnects.delete(userId)
            Server->>Server: return
        end

        Server->>Server: handleUserDisconnect(userId, roomId, 'disconnected')
        Server->>Service: leaveRoom(roomId, userId)

        alt User is Host
            Note over Service: Delete entire room
            Service->>Repo: for each member: deleteUserSocket,<br/>deleteUserRoom, deleteLoggedInUser
            Service->>Repo: deleteAllMessages(roomId)
            Service->>Repo: deleteRoom(roomId)
            Service-->>Server: { roomDeleted: true }

            Server->>Mediasoup: closeRoom(roomId)
            Mediasoup->>Mediasoup: Close all consumers, producers,<br/>transports, router

            Server->>Server: server.to(roomId).emit('member-left', {<br/>  userId, members: []<br/>})
            Server->>Server: server.to(roomId).emit('room-deleted', {<br/>  message: 'Host disconnected'<br/>})

        else User is Viewer
            Note over Service: Remove member from room
            Service->>Repo: removeMemberFromRoom(roomId, userId)
            Service-->>Server: { members: updatedMembers }

            Server->>Server: client.to(roomId).emit('member-left', {<br/>  userId, members<br/>})
        end

        Server->>Repo: deleteUserSocket(userId)
        Server->>Repo: deleteUserRoom(userId)
        Server->>Repo: deleteLoggedInUser(userId)
        Server->>Server: pendingDisconnects.delete(userId)

        Note over Server: USER DISCONNECTED PERMANENTLY
    end
```
