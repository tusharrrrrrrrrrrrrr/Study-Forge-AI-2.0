import time
from fastapi import HTTPException, Request

class RateLimiter:
    def __init__(self, requests_per_minute: int = 5):
        self.requests_per_minute = requests_per_minute
        self.clients = {}

    def __call__(self, request: Request):
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        
        if client_ip not in self.clients:
            self.clients[client_ip] = []
            
        self.clients[client_ip] = [req_time for req_time in self.clients[client_ip] if now - req_time < 60]
        
        if len(self.clients[client_ip]) >= self.requests_per_minute:
            raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")
            
        self.clients[client_ip].append(now)
        return True

auth_rate_limiter = RateLimiter(requests_per_minute=5)
