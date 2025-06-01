# ApiGateWay

## 📋 Quick Start Instructions

1. **Initialize project:**
```bash
mkdir api-management-service
cd api-management-service
npm init -y
npm install express express-rate-limit express-validator bcryptjs jsonwebtoken pg redis cors helmet morgan uuid axios dotenv
npm install --save-dev nodemon jest
```

2. **Setup environment:**
```bash
cp .env.example .env
# Edit .env with your database and Redis credentials
```

3. **Start services:**
```bash
# With Docker
docker-compose up -d

# Or manually start PostgreSQL and Redis, then:
npm run dev
```

4. **Initialize database:**
```bash
psql -h localhost -U postgres -d api_management -f migrations/init.sql