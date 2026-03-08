const BASE_URL = "https://li-vision.onrender.com";

export async function detectGesture(uri: string) {

  const form = new FormData();

  form.append("file", {
    uri,
    name: "frame.jpg",
    type: "image/jpeg"
  } as any);

  const response = await fetch(`${BASE_URL}/detect/detect`, {
    method: "POST",
    body: form,
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });

  return response.json();
}

export async function setRunMode(mode: string) {

  await fetch(`${BASE_URL}/admin/mode`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      run_mode: mode
    })
  });

}

export async function setDetectionMode(mode: string) {

  await fetch(`${BASE_URL}/admin/detection`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      mode: mode
    })
  });

}