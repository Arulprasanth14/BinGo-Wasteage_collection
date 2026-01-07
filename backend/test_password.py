"""
Quick script to test common PostgreSQL passwords
Run this to find your PostgreSQL password
"""
import psycopg2
import sys

# Common passwords to try
passwords_to_try = ['admin', 'postgres', 'password', 'root', '', '123456']

print("Testing common PostgreSQL passwords...\n")

for pwd in passwords_to_try:
    try:
        conn = psycopg2.connect(
            host="localhost",
            database="postgres",
            user="postgres",
            password=pwd,
            connect_timeout=3
        )
        print(f"✅ SUCCESS! Password is: '{pwd if pwd else '(empty)'}'")
        conn.close()
        sys.exit(0)
    except psycopg2.OperationalError as e:
        if "password authentication failed" in str(e):
            print(f"❌ Wrong password: '{pwd if pwd else '(empty)'}'")
        else:
            print(f"⚠️  Connection error with '{pwd if pwd else '(empty)'}': {e}")
    except Exception as e:
        print(f"⚠️  Error: {e}")

print("\n❌ None of the common passwords worked.")
print("You'll need to reset the password using pg_hba.conf method.")
print("See FIND_POSTGRES_PASSWORD.md for instructions.")


