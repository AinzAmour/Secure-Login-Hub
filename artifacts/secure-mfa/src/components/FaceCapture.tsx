import { useState, useEffect, useRef } from "react";
import * as faceapi from "face-api.js";
import { Loader2, ScanFace, CheckCircle2, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface FaceCaptureProps {
  onDescriptor: (descriptor: number[]) => void;
  mode?: "enroll" | "auth";
  className?: string;
}

type Challenge = "smile" | "blink" | "turn_left" | "turn_right" | "look_up" | "look_down";

const CHALLENGE_MESSAGES: Record<Challenge, string> = {
  smile: "Smile for the camera",
  blink: "Blink your eyes",
  turn_left: "Turn your head left",
  turn_right: "Turn your head right",
  look_up: "Look up slightly",
  look_down: "Look down slightly"
};

const getEAR = (eye: faceapi.Point[]) => {
  const vertical1 = Math.hypot(eye[1].x - eye[5].x, eye[1].y - eye[5].y);
  const vertical2 = Math.hypot(eye[2].x - eye[4].x, eye[2].y - eye[4].y);
  const horizontal = Math.hypot(eye[0].x - eye[3].x, eye[0].y - eye[3].y);
  return (vertical1 + vertical2) / (2.0 * horizontal);
};

export function FaceCapture({ onDescriptor, mode = "enroll", className }: FaceCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 100
  
  const intervalRef = useRef<number | null>(null);
  const finalDescriptorRef = useRef<Float32Array | null>(null);

  useEffect(() => {
    // Pick 2 random challenges
    const all: Challenge[] = ["smile", "blink", "turn_left", "turn_right", "look_up", "look_down"];
    const shuffled = all.sort(() => 0.5 - Math.random());
    setChallenges(shuffled.slice(0, 2));

    let mounted = true;
    async function loadModels() {
      try {
        const MODEL_URL = "https://justadudewhohacks.github.io/face-api.js/models";
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);
        if (mounted) setIsModelLoaded(true);
      } catch (err) {
        console.error("Failed to load face-api models", err);
        if (mounted) setError("Failed to load AI models. Please check network.");
      }
    }
    loadModels();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let stream: MediaStream | null = null;
    async function setupCamera() {
      if (!isModelLoaded) return;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access denied", err);
        setError("Camera access denied. Please allow camera permissions.");
      }
    }
    setupCamera();
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isModelLoaded]);

  const handleVideoPlay = () => {
    setIsCameraReady(true);
    let blinkDetected = false;
    let framesSinceBlink = 0;

    intervalRef.current = window.setInterval(async () => {
      if (!videoRef.current || isSuccess || challenges.length === 0) return;
      
      try {
        const detection = await faceapi.detectSingleFace(
          videoRef.current, 
          new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.4 })
        )
        .withFaceLandmarks()
        .withFaceExpressions()
        .withFaceDescriptor();
        
        if (!detection) {
          // If face is lost, don't reset everything but slow down progress
          setProgress(p => Math.max(0, p - 5));
          return;
        }

        // Store the best frontal descriptor when not turning head
        if (detection.detection.score > 0.7) {
          finalDescriptorRef.current = detection.descriptor;
        }

        const currentChallenge = challenges[currentChallengeIndex];
        if (!currentChallenge) return;

        let passed = false;
        const pts = detection.landmarks.positions;

        switch (currentChallenge) {
          case "smile":
            if (detection.expressions.happy > 0.6) passed = true;
            break;
          case "blink": {
            const leftEye = pts.slice(36, 42);
            const rightEye = pts.slice(42, 48);
            const earL = getEAR(leftEye);
            const earR = getEAR(rightEye);
            
            // Relaxed EAR threshold for blink detection
            if (earL < 0.22 && earR < 0.22) {
              blinkDetected = true;
              framesSinceBlink = 0;
            } else if (blinkDetected) {
              framesSinceBlink++;
              // If eyes stayed closed and then opened
              if (framesSinceBlink > 1) {
                passed = true;
                blinkDetected = false;
              }
            }
            break;
          }
          case "turn_left":
          case "turn_right": {
            const nose = pts[30];
            const leftCheek = pts[0];
            const rightCheek = pts[16];
            const distLeft = Math.abs(nose.x - leftCheek.x);
            const distRight = Math.abs(rightCheek.x - nose.x);
            const ratio = distLeft / distRight;
            
            // Adjusted ratios for easier detection
            if (currentChallenge === "turn_left" && ratio > 1.8) passed = true;
            if (currentChallenge === "turn_right" && ratio < 0.55) passed = true;
            break;
          }
          case "look_up":
          case "look_down": {
            const noseTop = pts[27];
            const noseTip = pts[30];
            const chin = pts[8];
            const distUp = Math.abs(noseTip.y - noseTop.y);
            const distDown = Math.abs(chin.y - noseTip.y);
            const vertRatio = distUp / distDown;
            
            if (currentChallenge === "look_up" && vertRatio < 0.7) passed = true;
            if (currentChallenge === "look_down" && vertRatio > 1.1) passed = true;
            break;
          }
        }

        if (passed) {
          setProgress(100);
          setTimeout(() => {
            if (currentChallengeIndex + 1 < challenges.length) {
              setCurrentChallengeIndex(c => c + 1);
              setProgress(0);
              blinkDetected = false;
              framesSinceBlink = 0;
            } else {
              setIsSuccess(true);
              if (intervalRef.current) clearInterval(intervalRef.current);
              if (finalDescriptorRef.current) {
                onDescriptor(Array.from(finalDescriptorRef.current));
              } else {
                onDescriptor(Array.from(detection.descriptor));
              }
            }
          }, 600);
        } else {
          // Pulse progress slightly to show it's scanning
          setProgress(p => Math.min(85, p + (Math.random() * 5)));
        }
      } catch (err) {
        console.error("Face detection error:", err);
      }
    }, 150);
  };

  if (error) {
    return (
      <div className={cn("bg-destructive/10 text-destructive p-4 rounded-xl flex flex-col items-center justify-center text-center backdrop-blur-sm border border-destructive/20", className)}>
        <ScanFace className="h-8 w-8 mb-2 opacity-60" />
        <p className="text-sm font-medium">{error}</p>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className={cn("bg-primary/5 border border-primary/20 p-8 rounded-2xl flex flex-col items-center justify-center text-center shadow-inner", className)}>
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <CheckCircle2 className="h-8 w-8 text-primary animate-in zoom-in" />
        </div>
        <h3 className="font-semibold text-lg mb-1">
          Liveness Verified
        </h3>
        <p className="text-sm text-muted-foreground">
          {mode === "enroll" ? "Your facial descriptors have been securely enrolled." : "Identity successfully confirmed."}
        </p>
      </div>
    );
  }

  const currentChallenge = challenges[currentChallengeIndex];

  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl bg-black group", className)}>
      {(!isModelLoaded || !isCameraReady || !currentChallenge) && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/90 backdrop-blur-md">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
          <p className="text-sm font-medium text-foreground/80">
            {!isModelLoaded ? "Loading Liveness AI..." : "Initializing Camera..."}
          </p>
        </div>
      )}
      
      <video 
        ref={videoRef}
        autoPlay 
        playsInline 
        muted
        onPlay={handleVideoPlay}
        className="w-full h-full object-cover aspect-square -scale-x-100 opacity-90 transition-opacity duration-500"
      />
      
      {/* Target UI Overlay */}
      <div className="absolute inset-0 z-20 pointer-events-none p-6 flex flex-col justify-between">
        <div className="flex justify-between w-full">
          <div className="w-8 h-8 border-t-2 border-l-2 border-primary/80 transition-all duration-300 rounded-tl-xl" style={{ opacity: progress > 0 ? 1 : 0.4 }} />
          <div className="w-8 h-8 border-t-2 border-r-2 border-primary/80 transition-all duration-300 rounded-tr-xl" style={{ opacity: progress > 0 ? 1 : 0.4 }} />
        </div>
        <div className="flex justify-between w-full mt-auto">
          <div className="w-8 h-8 border-b-2 border-l-2 border-primary/80 transition-all duration-300 rounded-bl-xl" style={{ opacity: progress > 0 ? 1 : 0.4 }} />
          <div className="w-8 h-8 border-b-2 border-r-2 border-primary/80 transition-all duration-300 rounded-br-xl" style={{ opacity: progress > 0 ? 1 : 0.4 }} />
        </div>
      </div>
      
      {/* Liveness Challenge Status Bar */}
      {currentChallenge && (
        <div className="absolute bottom-4 inset-x-4 bg-black/60 backdrop-blur-xl rounded-xl p-3 border border-white/10 text-center z-30 shadow-lg">
          <div className="flex items-center justify-center gap-2 mb-2">
            <UserCircle className="h-4 w-4 text-primary animate-pulse" />
            <span className="text-sm font-semibold text-white tracking-wide">
              {CHALLENGE_MESSAGES[currentChallenge]}
            </span>
          </div>
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-primary h-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
          <div className="mt-1.5 text-[10px] text-white/50 font-medium uppercase tracking-wider">
            Step {currentChallengeIndex + 1} of {challenges.length}
          </div>
        </div>
      )}
    </div>
  );
}
