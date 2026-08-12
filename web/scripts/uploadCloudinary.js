const CLOUD_NAME = "dfdinbti3";
const UPLOAD_PRESET = "goplay";
const FOLDER = "goplay";

async function uploadImage(file) {
  if (!file) throw new Error("Selecione um arquivo");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", FOLDER);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData },
  );

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.error) {
    throw new Error(data?.error?.message || "Falha no upload da imagem");
  }

  if (!data.secure_url) {
    throw new Error("Upload sem URL retornada");
  }

  return data.secure_url;
}

window.uploadImage = uploadImage;
