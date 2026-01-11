# Use the official Python 3.10 slim image as the base
FROM python:3.10-slim

# Set the working directory in the container
WORKDIR /app

# Install system dependencies if any, then Python dependencies
# First, copy just the requirements.txt to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies, including gunicorn
RUN pip install --no-cache-dir gunicorn -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose port 8080
EXPOSE 8080

# Define the command to run the application with Gunicorn
# Assuming your Flask app instance is named 'app' in 'app.py'
CMD ["gunicorn", "--bind", "0.0.0.0:${PORT}", "app:app"]
