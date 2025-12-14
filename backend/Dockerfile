FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Railway dynamically assigns PORT
ENV PORT=8000

# Run with uvicorn using dynamic port
CMD uvicorn app.main:app --host 0.0.0.0 --port $PORT
