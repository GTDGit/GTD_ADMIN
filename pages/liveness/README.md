# Panduan Integrasi AWS Face Liveness

## Overview

Halaman ini menggunakan **AWS Amplify FaceLivenessDetector** SDK resmi dari AWS untuk melakukan verifikasi liveness. SDK ini menggunakan AWS Rekognition Face Liveness API yang dapat mendeteksi apakah pengguna yang sedang melakukan verifikasi adalah orang asli (bukan foto/video).

## Cara Kerja

1. **Input NIK** - User memasukkan NIK 16 digit
2. **Create Session** - Backend membuat session di AWS Rekognition
3. **Liveness Detection** - SDK AWS melakukan capture wajah dengan tantangan (challenges)
4. **Get Result** - Backend mengambil hasil dari AWS dan menyimpan foto wajah

## Endpoints API

### 1. Create Liveness Session
```
POST /v1/identity/liveness/session
Headers:
  X-Client-ID: <client_id>
  Authorization: Bearer <client_secret>
  Content-Type: application/json

Body:
{
  "nik": "3275035402950020"
}

Response:
{
  "success": true,
  "data": {
    "sessionId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "nik": "3275035402950020"
  }
}
```

### 2. Get Liveness Result
```
POST /v1/identity/liveness/result
Headers:
  X-Client-ID: <client_id>
  Authorization: Bearer <client_secret>
  Content-Type: application/json

Body:
{
  "nik": "3275035402950020",
  "sessionId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}

Response (Success):
{
  "success": true,
  "data": {
    "nik": "3275035402950020",
    "sessionId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "isLive": true,
    "confidence": 98.5,
    "file": {
      "face": "https://bucket.s3.region.amazonaws.com/identity/liveness/3275035402950020/face.jpg"
    }
  }
}
```

## Instalasi Dependencies

```bash
npm install @aws-amplify/ui-react @aws-amplify/ui-react-liveness aws-amplify
```

## Environment Variables

Buat file `.env.local` di folder frontend:

```env
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:8080

# Client Authentication
NEXT_PUBLIC_CLIENT_ID=your_client_id_here
NEXT_PUBLIC_CLIENT_SECRET=your_client_secret_here

# AWS Credentials for Face Liveness
NEXT_PUBLIC_AWS_REGION=ap-northeast-1
NEXT_PUBLIC_AWS_ACCESS_KEY_ID=your_aws_access_key_id
NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
```

## Konfigurasi AWS

### Region yang Didukung
AWS Face Liveness hanya tersedia di beberapa region:
- `ap-northeast-1` (Tokyo) - **Recommended**
- `us-east-1` (N. Virginia)
- `us-west-2` (Oregon)
- `eu-west-1` (Ireland)
- `ap-south-1` (Mumbai)

### IAM Policy yang Diperlukan
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "rekognition:CreateFaceLivenessSession",
        "rekognition:GetFaceLivenessSessionResults",
        "rekognition:DetectFaces"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::your-bucket/*"
    }
  ]
}
```

## Troubleshooting

### Error: "Failed to create session"
- Pastikan AWS credentials valid
- Pastikan region mendukung Face Liveness
- Cek IAM permissions

### Error: "Camera not found"
- Izinkan akses kamera di browser
- Pastikan menggunakan HTTPS (kecuali localhost)

### Error: "Liveness verification failed"
- Pencahayaan kurang baik
- Wajah tidak terlihat jelas
- User tidak mengikuti instruksi dengan benar

## Running Frontend

```bash
cd frontend
npm install
npm run dev
```

Akses: http://localhost:3000/liveness

## Catatan Keamanan

1. Untuk **production**, gunakan **AWS Cognito Identity Pool** untuk credentials
2. Jangan commit `.env.local` ke repository
3. Gunakan HTTPS di production
4. Batasi IAM policy hanya untuk resource yang diperlukan
