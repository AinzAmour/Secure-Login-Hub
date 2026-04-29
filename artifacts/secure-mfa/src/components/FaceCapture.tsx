import { useState, useEffect, useRef } from "react";
import * as faceapi from "face-api.js";
import { Loader2, ScanFace, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FaceCaptureProps {
  onDescriptor: (descriptor: number[]) => void;
  mode?: "enroll" | "auth";
  className?: string;
}

export function FaceCapture({ onDescriptor, mode = "enroll", className }: FaceCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const consecutiveRef = useRef(0);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;
    
    async function loadModels() {
      try {
        const MODEL_URL = "https://justadudewhohacks.github.io/face-api.js/models";
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        if (mounted) setIsModelLoaded(true);
      } catch (err) {
        console.error("Failed to load face-api models", err);
        if (mounted) setError("Failed to load facial recognition models.");
      }
    }
    
    loadModels();
    
    return () => {
      mounted = false;
    };
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
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isModelLoaded]);

  const handleVideoPlay = () => {
    setIsCameraReady(true);
    
    intervalRef.current = window.setInterval(async () => {
      if (!videoRef.current || isSuccess) return;
      
      const detection = await faceapi.detectSingleFace(
        videoRef.current, 
        new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
      )
      .withFaceLandmarks()
      .withFaceDescriptor();
      
      if (detection) {
        setConfidence(detection.detection.score);
        if (detection.detection.score > 0.8) {
          consecutiveRef.current += 1;
          if (consecutiveRef.current >= 3) {
            setIsSuccess(true);
            if (intervalRef.current) clearInterval(intervalRef.current);
            onDescriptor(Array.from(detection.descriptor));
          }
        } else {
          consecutiveRef.current = 0;
        }
      } else {
        setConfidence(0);
        consecutiveRef.current = 0;
      }
    }, 500);
  };

  if (error) {
    return (
      <div className={cn("bg-destructive/10 text-destructive p-4 rounded-lg flex flex-col items-center justify-center text-center", className)}>
        <ScanFace className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm font-medium">{error}</p>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className={cn("bg-primary/5 border border-primary/20 p-8 rounded-xl flex flex-col items-center justify-center text-center", className)}>
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <CheckCircle2 className="h-8 w-8 text-primary animate-in zoom-in" />
        </div>
        <h3 className="font-semibold text-lg mb-1">
          {mode === "enroll" ? "Face Profile Enrolled" : "Face Verified"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {mode === "enroll" ? "Your facial descriptors have been securely stored." : "Identity confirmed."}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded-xl border bg-black", className)}>
      {(!isModelLoaded || !isCameraReady) && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-sm font-medium">
            {!isModelLoaded ? "Loading AI models..." : "Initializing camera..."}
          </p>
        </div>
      )}
      
      <video 
        ref={videoRef}
        autoPlay 
        playsInline 
        muted
        onPlay={handleVideoPlay}
        className="w-full h-full object-cover aspect-square -scale-x-100"
      />
      
      {/* Scanning UI Overlay */}
      <div className="absolute inset-0 z-20 pointer-events-none p-6 flex flex-col justify-between">
        <div className="flex justify-between w-full">
          <div className="w-8 h-8 border-t-2 border-l-2 border-primary/80 transition-all duration-300" style={{ opacity: confidence > 0.5 ? 1 : 0.5 }} />
          <div className="w-8 h-8 border-t-2 border-r-2 border-primary/80 transition-all duration-300" style={{ opacity: confidence > 0.5 ? 1 : 0.5 }} />
        </div>
        
        {/* Sweep line */}
        <div className="absolute inset-x-0 h-1 bg-primary/40 blur-sm animate-[scan_2s_ease-in-out_infinite]" />
        
        <div className="flex justify-between w-full mt-auto">
          <div className="w-8 h-8 border-b-2 border-l-2 border-primary/80 transition-all duration-300" style={{ opacity: confidence > 0.5 ? 1 : 0.5 }} />
          <div className="w-8 h-8 border-b-2 border-r-2 border-primary/80 transition-all duration-300" style={{ opacity: confidence > 0.5 ? 1 : 0.5 }} />
        </div>
      </div>
      
      {/* Status Bar */}
      <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-md p-3 text-center z-30">
        <div className="flex items-center justify-center gap-2 mb-1">
          <ScanFace className="h-4 w-4 text-white/80" />
          <span className="text-xs font-medium text-white">
            {confidence > 0.8 ? "Hold still..." : "Position face in frame"}
          </span>
        </div>
        <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
          <div 
            className="bg-primary h-full transition-all duration-300 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, confidence * 100))}%` }}
          />
        </div>
      </div>
    </div>
  );
}
