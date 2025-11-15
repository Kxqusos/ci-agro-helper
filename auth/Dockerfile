# syntax=docker/dockerfile:1.7
FROM python:3.13-slim

WORKDIR /app

COPY requirements.txt .

# Install runtime tools for healthchecks and then dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
