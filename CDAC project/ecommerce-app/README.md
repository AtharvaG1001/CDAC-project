# ShopWave — E-Commerce Web App (GCP / Azure Variant)

> **CDAC Project** | Full-stack e-commerce application architected for GCP and Azure cloud hosting.

---

## 📁 Project Structure

```
ecommerce-app/
├── index.html          ← Storefront (GCP Storage / Azure Static Web Apps)
├── admin.html          ← Admin Dashboard
├── css/
│   └── styles.css      ← Full design system (dark-mode, glassmorphism)
├── js/
│   ├── functions.js    ← Cloud Functions / Logic Apps simulation
│   ├── cart.js         ← Cart manager (localStorage = Blob Storage)
│   ├── checkout.js     ← Multi-step checkout flow
│   ├── admin.js        ← Admin panel controller
│   └── app.js          ← Main app bootstrap
├── data/
│   ├── products.json   ← Product catalogue (20 items)
│   ├── orders.json     ← Orders store (initially empty)
│   └── categories.json ← Category taxonomy
└── README.md
```

---

## 🚀 Running Locally

Since all files are static, you need a local HTTP server (direct file:// open blocks `fetch()`).

### Option A — Python (recommended, zero install)
```bash
cd "ecommerce-app"
python -m http.server 8080
# Open: http://localhost:8080
```

### Option B — Node.js `http-server`
```bash
npx http-server ecommerce-app -p 8080 -o
```

### Option C — VS Code Live Server
Right-click `index.html` → **Open with Live Server**

---

## ☁️ GCP Deployment

### 1. Frontend → GCP Cloud Storage Static Hosting

```bash
# Create bucket
gsutil mb -l asia-south1 gs://shopwave-frontend

# Enable static website
gsutil web set -m index.html -e index.html gs://shopwave-frontend

# Upload all files
gsutil -m rsync -r ./ecommerce-app gs://shopwave-frontend

# Make public
gsutil iam ch allUsers:objectViewer gs://shopwave-frontend
```

**Live URL:** `https://storage.googleapis.com/shopwave-frontend/index.html`

### 2. (Optional) GCP CDN + Custom Domain
```bash
gcloud compute backend-buckets create shopwave-backend \
  --gcs-bucket-name=shopwave-frontend --enable-cdn

gcloud compute url-maps create shopwave-lb \
  --default-backend-bucket=shopwave-backend
```

### 3. Backend → GCP Cloud Functions

Convert `js/functions.js` exports to Cloud Function endpoints:

```javascript
// functions/getProducts/index.js (Node.js 20)
const { Storage } = require('@google-cloud/storage');
const storage = new Storage();

exports.getProducts = async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  const file = storage.bucket('shopwave-data').file('products.json');
  const [content] = await file.download();
  let products = JSON.parse(content.toString());
  // Apply filters from req.query ...
  res.json({ success: true, data: products });
};
```

```bash
# Deploy Cloud Function
gcloud functions deploy getProducts \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --region asia-south1
```

### 4. Data Store → GCP Cloud Storage Bucket (JSON Blobs)

```bash
gsutil mb gs://shopwave-data
gsutil cp data/products.json gs://shopwave-data/
gsutil cp data/orders.json   gs://shopwave-data/
gsutil cp data/categories.json gs://shopwave-data/
```

---

## 🔷 Azure Deployment

### 1. Frontend → Azure Static Web Apps

```bash
# Install Azure CLI
az login

# Create resource group
az group create --name shopwave-rg --location centralindia

# Create Static Web App
az staticwebapp create \
  --name shopwave-app \
  --resource-group shopwave-rg \
  --source https://github.com/your-repo \
  --location centralindia \
  --branch main \
  --app-location "/ecommerce-app" \
  --output-location ""
```

Or via Azure Portal: **Static Web Apps** → New → Connect GitHub repo.

### 2. Backend → Azure Functions (Node.js)

```javascript
// GetProducts/index.js
const { BlobServiceClient } = require('@azure/storage-blob');

module.exports = async function(context, req) {
  const client = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONN);
  const container = client.getContainerClient('shopwave-data');
  const blob = container.getBlobClient('products.json');
  const download = await blob.download(0);
  const content = await streamToText(download.readableStreamBody);
  context.res = { body: JSON.parse(content) };
};
```

```bash
func azure functionapp publish shopwave-functions
```

### 3. Data Store → Azure Blob Storage

```bash
az storage account create \
  --name shopwavedata \
  --resource-group shopwave-rg \
  --sku Standard_LRS

az storage container create \
  --name shopwave-data \
  --account-name shopwavedata \
  --public-access blob

az storage blob upload --file data/products.json   --container-name shopwave-data --name products.json   --account-name shopwavedata
az storage blob upload --file data/orders.json     --container-name shopwave-data --name orders.json     --account-name shopwavedata
az storage blob upload --file data/categories.json --container-name shopwave-data --name categories.json --account-name shopwavedata
```

### 4. Azure Logic Apps (Order Workflow)

Create a Logic App with:
- **Trigger:** HTTP Request (POST /orders)
- **Action 1:** Parse JSON body
- **Action 2:** Azure Blob Storage → Append order to orders.json
- **Action 3:** Send email confirmation (Office 365 connector)
- **Response:** Return order ID

---

## 🗺️ Architecture Diagram

```
 USER BROWSER
      │
      ▼
┌─────────────────────────────────────────────────────────┐
│  Frontend (HTML/CSS/JS — SPA)                           │
│  GCP: Cloud Storage + CDN  │  Azure: Static Web Apps    │
└────────────────────┬────────────────────────────────────┘
                     │ fetch() API calls
      ┌──────────────▼──────────────────┐
      │  Backend Serverless Layer        │
      │  GCP: Cloud Functions (Node.js)  │
      │  Azure: Functions + Logic Apps   │
      └──────────────┬──────────────────┘
                     │ Read/Write JSON
      ┌──────────────▼──────────────────┐
      │  Data Store (JSON/CSV Blobs)     │
      │  GCP: Cloud Storage Bucket       │
      │  Azure: Blob Storage Container   │
      └─────────────────────────────────┘
```

---

## ✨ Features

| Feature | Details |
|---------|---------|
| Product Catalogue | 20 products across 6 categories |
| Search & Filter | Real-time search + category + sort |
| Product Detail | Modal with features, rating, quantity |
| Shopping Cart | Add/update/remove, persistent session |
| Checkout | 3-step: Shipping → Payment → Review |
| Order Store | Saved to localStorage (Blob simulation) |
| Admin Dashboard | Orders table, products grid, analytics |
| Order Status | Update pending/shipped/delivered |
| Responsive | Mobile-first, works on all screen sizes |
| Dark Mode | Full premium dark-mode aesthetic |

---

## 🛠️ Tech Stack

- **Frontend:** Vanilla HTML5, CSS3, ES6+ JavaScript (no framework)
- **Fonts:** Google Fonts — Outfit + Inter
- **Backend Simulation:** JS modules mimicking Cloud Functions
- **Storage:** JSON files (GCP Cloud Storage / Azure Blob) + localStorage
- **Hosting:** GCP Cloud Storage Static / Azure Static Web Apps

---

*CDAC Project — GCP/Azure E-Commerce Variant · 2026*
