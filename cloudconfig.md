- Cloud Run 
Why?
1) Better free tier
2) Zero Idle Cost 
3) Scales automatically during actual disaster evnts when traffic spikes 

- Deployment Picture 
Google Cloud Run - FastAPI - Supabase - User's Phone 

- Phases of Deployment 
1) Prepare Google Cloud 
* Create a Google Cloud Account 

* Create a Project 
 Install Google Cloud SDK first 
 Then run: gcloud auth login 
           gcloud projects create nepal-disaster-app
           gcloud config set project nepal-disaster-app 

* Enable Required Services 
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com 
gcloud services enable artifactregistry.googleapis.com 

2) Prepare backend for the cloud 
* Create the Dockerfile (backend/Dockerfile)
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8080
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]

* Create a .dockerignore file (backend/.dockerignore)
.venv
__pycache__
*.pyc
.env
push_tokens.json
*.md
*

* Test Docker locally first 
cd backend
docker build -t nepal-disaster-api .
docker run -p 8080:8080 nepal-disaster-api

3) Handle environment variables safely 
* Set environment variables in Cloud Run 

4) Deploy to Cloud Run 
* Build and push container 
In backend, 
- Build and submit to Google Cloud Build
gcloud builds submit --tag gcr.io/nepal-disaster-app/api

* Deploy to Cloud Run 
gcloud run deploy nepal-disaster-api \
  --image gcr.io/nepal-disaster-app/api \
  --platform managed \
  --region asia-south1 \  - closest google region to nepal 
  --allow-unauthenticated \
  --set-env-vars SUPABASE_URL=your-value \
  --set-env-vars SUPABASE_ANON_KEY=your-value \
  --set-env-vars SUPABASE_SERVICE_KEY=your-value \
  --set-env-vars BIPAD_USERNAME=your-value \
  --set-env-vars BIPAD_PASSWORD=your-value \
  --memory 512Mi \
  --min-instances 0 \
  --max-instances 10

- this gives a permanent URL 
- verify its live 

5) Update the mobile app 
* Update mobile environment 
EXPO_PUBLIC_API_BASE_URL=https://nepal-disaster-api-abc123-uc.a.run.app

* Rebuild the mobile app
cd mobile
npx expo start --clear

* For the demo 
Android, 
npx eas build --platform android --profile preview    

iOs, 
- Apple Development Account 
- Test Flight 
* Get apple developer account, use EAS build to create the IPA and upload to testflight and testers get an email invite and install through the testflight app. 

* Ongoing deployment for every update to backend code 
cd backend
gcloud builds submit --tag gcr.io/nepal-disaster-app/api
gcloud run deploy nepal-disaster-api --image gcr.io/nepal-disaster-app/api

- Summary Picture 
Create GCP account and project 
Write dockerfile and test locally 
Deploy to cloud run 
verify live URL works 
Update mobile .env 
Build APK with livel URL baked in 
Test on real device hitting cloud backend 
Share APK for demo (easier but we can try and get the IPA too)