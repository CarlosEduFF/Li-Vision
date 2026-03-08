const API_URL = "https://li-vision.onrender.com/detect/detect";

export async function detectGesture(uri: string) {
  const formData = new FormData();

  formData.append("file", {
    uri,
    name: "frame.jpg",
    type: "image/jpeg",
  } as any);

  const response = await fetch(API_URL, {
    method: "POST",
    body: formData,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return await response.json();
}