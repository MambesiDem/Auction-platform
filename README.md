# ConnSB — Auction Platform

A live web-based auction platform connecting sellers, buyers, and drivers.
Built with Spring Boot (backend) and React (frontend).

## Project Structure


## Tech Stack

**Backend**
- Java 21 + Spring Boot
- PostgreSQL (Neon)
- JWT Authentication
- WebSocket (STOMP) for live bidding
- Spring Security with role-based access
- PayFast payment gateway with escrow
- Docker (deployment)

**Frontend**
- React 18
- React Router
- Axios
- STOMP WebSocket
- CSS Modules

## Features
- Live real-time bidding with WebSocket
- Role-based access (Buyer, Seller, Driver, Admin)
- Escrow payment system via PayFast (5% platform commission)
- Delivery tracking with driver status updates
- Automatic payment release on delivery confirmation
- Auction auto-close scheduler
- Optimistic locking for concurrent bid protection

## Live Demo
- **Frontend:** https://bidora-platform-zeta.vercel.app
- **Backend API:** https://auction-platform-xdrx.onrender.com

---

## Backend Setup

1. Navigate to the `backend` folder:
```bash
cd backend
```

2. Copy `src/main/resources/application.properties.example`
   to `src/main/resources/application.properties`:
```bash
cp src/main/resources/application.properties.example src/main/resources/application.properties
```

3. Fill in your values:
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/auction_db
spring.datasource.username=your_db_username
spring.datasource.password=your_db_password
jwt.secret=your_jwt_secret
jwt.expiration=86400000
payfast.merchant-id=your_merchant_id
payfast.merchant-key=your_merchant_key
payfast.passphrase=your_passphrase
payfast.sandbox=true
payfast.return-url=http://localhost:3000/payment/success
payfast.cancel-url=http://localhost:3000/payment/cancel
payfast.notify-url=https://your-ngrok-url/api/payments/notify
platform.commission=0.05
frontend.url=http://localhost:3000
```

4. Create a PostgreSQL database:
```sql
CREATE DATABASE auction_db;
```

5. Run the backend:
```bash
./mvnw spring-boot:run
```

API runs on `http://localhost:8081`

---

## Frontend Setup

1. Navigate to the `frontend` folder:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Copy `.env.example` to `.env` and fill in:


4. Start the frontend:
```bash
npm start
```

App runs on `http://localhost:3000`

---

## Running the Full App

Start the backend first, then the frontend. Both must be running simultaneously.

> **Note:** For PayFast payment testing locally, you need [ngrok](https://ngrok.com)
> to expose your backend to the internet:
> ```bash
> ngrok http 8081
> ```
> Update `payfast.notify-url` in `application.properties` with your ngrok URL.

---

## User Roles

| Role | Description |
|------|-------------|
| BUYER | Browse auctions, place bids, pay for won items, track delivery |
| SELLER | Create auctions, manage listings, initiate deliveries |
| DRIVER | Browse delivery jobs, accept and update delivery status |
| ADMIN | Manage all users, auctions, deliveries, and payments |

> ADMIN accounts cannot be self-registered. The first admin must be inserted
> directly into the database. Subsequent admins can be created via the admin dashboard.

---

## Contributing

1. Fork the repository
2. Create a feature branch:
```bash
git checkout -b feature/your-feature-name
```
3. Commit your changes:
```bash
git commit -m "Add your feature"
```
4. Push to your branch:
```bash
git push origin feature/your-feature-name
```
5. Open a Pull Request

---

## License
MIT