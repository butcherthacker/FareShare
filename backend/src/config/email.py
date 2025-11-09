"""
Email Configuration for FastAPI-Mail
Handles email sending functionality for verification, notifications, etc.
"""
import os
from pathlib import Path
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from pydantic import EmailStr
from typing import List

# Email configuration from environment variables
conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME", ""),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD", ""),
    MAIL_FROM=os.getenv("MAIL_FROM", "noreply@fareshare.com"),
    MAIL_PORT=int(os.getenv("MAIL_PORT", "587")),
    MAIL_SERVER=os.getenv("MAIL_SERVER", "smtp.gmail.com"),
    MAIL_STARTTLS=os.getenv("MAIL_STARTTLS", "True").lower() == "true",
    MAIL_SSL_TLS=os.getenv("MAIL_SSL_TLS", "False").lower() == "true",
    USE_CREDENTIALS=os.getenv("USE_CREDENTIALS", "True").lower() == "true",
    VALIDATE_CERTS=os.getenv("VALIDATE_CERTS", "True").lower() == "true",
    MAIL_FROM_NAME=os.getenv("MAIL_FROM_NAME", "FareShare")
)

# Initialize FastMail instance
fm = FastMail(conf)


async def send_verification_email(email: EmailStr, full_name: str, verification_token: str):
    """
    Send email verification link to newly registered user.
    
    Args:
        email: User's email address
        full_name: User's full name for personalization
        verification_token: JWT token for email verification
    """
    # Build verification URL - update with your actual frontend URL
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    verification_url = f"{frontend_url}/verify-email?token={verification_token}"
    
    # HTML email template
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
            }}
            .container {{
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }}
            .header {{
                background-color: #4F46E5;
                color: white;
                padding: 20px;
                text-align: center;
                border-radius: 5px 5px 0 0;
            }}
            .content {{
                background-color: #f9f9f9;
                padding: 30px;
                border-radius: 0 0 5px 5px;
            }}
            .button {{
                display: inline-block;
                padding: 12px 30px;
                background-color: #4F46E5;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
            }}
            .footer {{
                text-align: center;
                margin-top: 20px;
                font-size: 12px;
                color: #666;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to FareShare!</h1>
            </div>
            <div class="content">
                <h2>Hi {full_name},</h2>
                <p>Thank you for registering with FareShare. To complete your registration and start using our ride-sharing platform, please verify your email address.</p>
                
                <p>Click the button below to verify your email:</p>
                
                <center>
                    <a href="{verification_url}" class="button">Verify Email Address</a>
                </center>
                
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #4F46E5;">{verification_url}</p>
                
                <p><strong>This link will expire in 24 hours.</strong></p>
                
                <p>If you didn't create an account with FareShare, please ignore this email.</p>
                
                <p>Best regards,<br>The FareShare Team</p>
            </div>
            <div class="footer">
                <p>&copy; 2025 FareShare. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    message = MessageSchema(
        subject="Verify Your FareShare Email Address",
        recipients=[email],
        body=html,
        subtype=MessageType.html
    )
    
    await fm.send_message(message)


async def send_password_reset_email(email: EmailStr, full_name: str, reset_token: str):
    """
    Send password reset link to user.
    
    Args:
        email: User's email address
        full_name: User's full name for personalization
        reset_token: JWT token for password reset
    """
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    reset_url = f"{frontend_url}/reset-password?token={reset_token}"
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
            }}
            .container {{
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }}
            .header {{
                background-color: #4F46E5;
                color: white;
                padding: 20px;
                text-align: center;
                border-radius: 5px 5px 0 0;
            }}
            .content {{
                background-color: #f9f9f9;
                padding: 30px;
                border-radius: 0 0 5px 5px;
            }}
            .button {{
                display: inline-block;
                padding: 12px 30px;
                background-color: #DC2626;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
            }}
            .footer {{
                text-align: center;
                margin-top: 20px;
                font-size: 12px;
                color: #666;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Password Reset Request</h1>
            </div>
            <div class="content">
                <h2>Hi {full_name},</h2>
                <p>We received a request to reset your password for your FareShare account.</p>
                
                <p>Click the button below to reset your password:</p>
                
                <center>
                    <a href="{reset_url}" class="button">Reset Password</a>
                </center>
                
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #4F46E5;">{reset_url}</p>
                
                <p><strong>This link will expire in 1 hour.</strong></p>
                
                <p>If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
                
                <p>Best regards,<br>The FareShare Team</p>
            </div>
            <div class="footer">
                <p>&copy; 2025 FareShare. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    message = MessageSchema(
        subject="Reset Your FareShare Password",
        recipients=[email],
        body=html,
        subtype=MessageType.html
    )
    
    await fm.send_message(message)
