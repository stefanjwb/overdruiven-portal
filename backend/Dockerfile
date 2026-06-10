FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Draai als niet-root gebruiker
RUN adduser --disabled-password --gecos "" appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# --proxy-headers: vertrouw X-Forwarded-For van nginx zodat rate limiting per
# bezoeker werkt i.p.v. per proxy-IP. De backend-poort is niet publiek bereikbaar
# (alleen nginx kan erbij via het Docker-netwerk), dus "*" is hier veilig.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"]
