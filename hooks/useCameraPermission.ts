import { useEffect, useState } from "react";
import { Camera } from "expo-camera";

export function useCameraPermission() {

  const [granted, setGranted] = useState<boolean | null>(null);

  useEffect(() => {
    Camera.requestCameraPermissionsAsync()
      .then(res => setGranted(res.status === "granted"));
  }, []);

  return granted;
}