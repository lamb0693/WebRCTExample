import { useEffect, useRef } from "react";
//import { useParams } from "react-router-dom";
import { io, Socket } from "socket.io-client";

const VideoCall = () => {
  const socketRef = useRef<Socket>();
  const myVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection>();
  const SGINAL_SERVER = 'http://10.100.203.62:3002'

  //const { roomName } = useParams();

  const getMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      if (myVideoRef.current) {
        console.log('my video stream', stream)
        myVideoRef.current.srcObject = stream;
      }

      if (!(pcRef.current && socketRef.current)) {
        return;
      }

      stream.getTracks().forEach((track) => {
        if (!pcRef.current) {
          return;
        }
        pcRef.current.addTrack(track, stream);
      });

      pcRef.current.onicecandidate = (e) => {
        if (e.candidate) {
          if (!socketRef.current) {
            return;
          }
          console.log("pc.onicecandiate sending ice", e.candidate);
          socketRef.current.emit("ice", e.candidate);
        }
      };

      pcRef.current.ontrack = (e) => {
        if (remoteVideoRef.current) {
          console.log("on track", e.streams);
          remoteVideoRef.current.srcObject = e.streams[0];
        }
      };

    } catch (e) {
      console.error(e);
    }
  };

  const createOffer = async () => {
    console.log("create Offer");
    if (!(pcRef.current && socketRef.current)) {
      return;
    }
    try {
        const sdp  = await pcRef.current.createOffer();
        pcRef.current.setLocalDescription(sdp);
        console.log("sent the offer", sdp);

        const offerObject = {
            sdp: sdp.sdp,
            type: sdp.type,
        };

        socketRef.current.emit("offer", offerObject);
    } catch (e) {
      console.error(e);
    }
  };

//   const createAnswer = async (sdp: RTCSessionDescription) => {
//     console.log("createAnswer", sdp);
//     if (!(pcRef.current && socketRef.current)) {
//       return;
//     }

//     try {
//       pcRef.current.setRemoteDescription(sdp);
//       const answerSdp = await pcRef.current.createAnswer();
//       pcRef.current.setLocalDescription(answerSdp);

//       console.log("sent the answer", sdp);
//       socketRef.current.emit("answer", answerSdp);
//     } catch (e) {
//       console.error(e);
//     }
//   };

  useEffect(() => {
    socketRef.current = io(SGINAL_SERVER);

    console.log("setting stun")
    pcRef.current = new RTCPeerConnection({
      iceServers: [
        {
          urls: "stun:stun.l.google.com:19302",
        },
      ],
    });

    console.log("setting joined")
    socketRef.current.on("joined", ()=> {
        console.log('joined')
        createOffer()
    });

    // console.log("setting offer")
    // socketRef.current.on("offer", (sdp: RTCSessionDescription) => {
    //   console.log("recv Offer");
    //   createAnswer(sdp);
    // });

    console.log("setting answer")
    socketRef.current.on("answer", (answer) => {
      console.log("recv answer", answer);
        if (!pcRef.current) {
            console.log('pcRef null')
            return;
        }

        // Parse the JSON string into an object
        //const answerObject = JSON.parse(answer);
        //console.log('answerObject', answerObject)

        // Parse the JSON values directly into RTCSessionDescription
        // const rtcSessionDescription = new RTCSessionDescription({
        //     sdp: answerObject.sdp,
        //     type: answerObject.type,
        // });

        //console.log('seeting rtcSessionDescription in pcRef', rtcSessionDescription)
        //pcRef.current.setRemoteDescription(rtcSessionDescription);
        const rtcSessionDescription = new RTCSessionDescription({
          sdp: answer.sdp,
          type: answer.type,
        })

        pcRef.current.setRemoteDescription( rtcSessionDescription)
    });

    console.log("setting ice")
    socketRef.current.on("ice", async (iceData) => {
        console.log('socketRef.current.on ice :', iceData)

        if (!pcRef.current) {
            return;
        }

        try {
            // Check if the expected properties are present
            if (iceData.sdpMid != null && iceData.sdpMLineIndex != null) {
                const iceCandidate = new RTCIceCandidate({
                    candidate: iceData.candidate,
                    sdpMid: iceData.sdpMid,
                    sdpMLineIndex: iceData.sdpMLineIndex,
                });
    
                console.log('Adding iceCandidate:', iceCandidate);
    
                await pcRef.current.addIceCandidate(iceCandidate);
            }
        } catch (error) {
            console.error('Error parsing iceData:', error);
        }

        // try {
        //     // Parse the JSON string into an object
        //     const iceDataObj = JSON.parse(iceData);
    
        //     console.log('Parsed iceData:', iceDataObj);
    
        //     // Check if the expected properties are present
        //     if (iceDataObj.sdpMid != null && iceDataObj.sdpMLineIndex != null) {
        //         const iceCandidate = new RTCIceCandidate({
        //             candidate: iceDataObj.candidate,
        //             sdpMid: iceDataObj.sdpMid,
        //             sdpMLineIndex: iceDataObj.sdpMLineIndex,
        //             usernameFragment: iceDataObj.usernameFragment,
        //         });
    
        //         console.log('Adding iceCandidate:', iceCandidate);
    
        //         await pcRef.current.addIceCandidate(iceCandidate);
        //     }
        // } catch (error) {
        //     console.error('Error parsing iceData:', error);
        // }
      
    });

    //socketRef.current.emit("join_room", 'join');

    getMedia();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (pcRef.current) {
        pcRef.current.close();
      }
    };
  }, []);

  return (
    <div>
      <video
        id="myvideo"
        style={{
          width: 240,
          height: 240,
          backgroundColor: "black",
        }}
        ref={myVideoRef}
        autoPlay
      />
      <video
        id="remotevideo"
        style={{
          width: 240,
          height: 240,
          backgroundColor: "green",
        }}
        ref={remoteVideoRef}
        autoPlay
      />
    </div>
  );
};

export default VideoCall;