"""
Hotel Voice Booking Agent

A voice AI agent for hotel room booking using LiveKit Agents framework.
Guests call in, authenticate via name + DOB, and can view/create/modify/cancel bookings.

STT: Sarvam Saaras v3
LLM: Groq (openai/gpt-oss-20b)
TTS: Sarvam Bulbul v3
"""

from __future__ import annotations

import json
import logging
import os
from typing import Annotated

from dotenv import load_dotenv
from livekit import agents
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    JobProcess,
    RunContext,
    function_tool,
    room_io,
)
from livekit.plugins import groq, silero
from livekit.plugins.sarvam import STT as sarvam_stt  # noqa: N811
from livekit.plugins.sarvam import TTS as sarvam_tts  # noqa: N811
from livekit.plugins import minimax
from supabase import Client, create_client

# Load environment variables from .env.local
load_dotenv(".env.local")

# Initialize logger for debugging
logger = logging.getLogger("hotel_agent")


# =============================================================================
# SUPABASE DATABASE CONNECTION
# =============================================================================

def get_supabase_client() -> Client:
    """
    Create and return a Supabase client using service_role key.
    Service role bypasses RLS for admin database operations.
    """
    import os
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_service_key = os.getenv("SUPABASE_SERVICE_KEY")

    if not supabase_url or not supabase_service_key:
        raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment")

    return create_client(supabase_url, supabase_service_key)


# =============================================================================
# HOTEL AGENT CLASS
# =============================================================================

class HotelAgent(Agent):
    """
    The Hotel Booking Voice Agent.
    Handles guest authentication and booking management via voice conversation.
    """

    def __init__(self) -> None:
        super().__init__(
            instructions="""
            You are a helpful hotel booking voice assistant for Grand Hotel.

            Your job is to help guests manage their hotel room bookings.

            IMPORTANT RULES:
            1. Always greet the guest warmly and ask for their name and date of birth for authentication
            2. Once authenticated, you can help them with:
               - Viewing their existing bookings (use get_bookings tool)
               - Creating a new booking (use create_booking tool)
               - Modifying their booking dates, room type (use modify_booking tool)
               - Cancelling their booking (use cancel_booking tool)
            3. Be friendly, professional, and concise in your responses
            4. When collecting information for a new booking, ask for:
               - Desired check-in date
               - Number of days to stay
               - Room type preference (standard, deluxe, or suite)
               - Any additional features (breakfast, late checkout, spa, etc.)
            5. When modifying, always confirm what changes they want before calling the tool
            6. Always confirm the booking details before finalizing

            RESPONSE STYLE:
            Your responses are concise, to the point, and without any complex formatting or punctuation including emojis, asterisks, or other symbols.
            You are curious, friendly, and have a sense of humor.

            VOICE OUTPUT REQUIREMENTS:
            This is a voice-first interaction. All your responses will be spoken aloud by a text-to-speech system. Keep this in mind:
            - Never use numbered lists (1. 2. 3.), bullet points, or any list notation. Instead, use natural sentences separated by pauses.
            - Never use slashes, dashes, or technical date formats like YYYY-MM-DD. Write dates naturally like "May 15th, 2026" or "the fifteenth of May".
            - Use words for numbers in general speech: say "five days" not "5 days", say "twelve noon" not "12:00 PM".
            - Avoid technical symbols like @, #, &, %, $, etc. in spoken responses.
            - Keep sentences short and clear for natural speech flow.
            - Do not use abbreviations like "DOB", "TTS", "LLM" in spoken responses. Say "date of birth" instead.

            Room Types:
            - standard: Basic room with essential amenities
            - deluxe: Upgraded room with better view and amenities
            - suite: Premium suite with separate living area

            Available Features (can be added as JSON):
            - breakfast: true/false
            - late_checkout: true/false
            - spa: true/false

            Start by greeting the guest and asking for their name.
            """,
        )

    @function_tool(description="""
    Search for bookings in the hotel system.
    Returns all bookings matching the customer's name and date of birth.
    """)
    async def get_bookings(
        self,
        context: RunContext,
        customer_name: Annotated[str, "The customer's full name"],
        dob: Annotated[str, "The customer's date of birth in YYYY-MM-DD format"]
    ) -> str:
        """Search for bookings by customer name and DOB"""
        logger.info(f"Searching bookings for: {customer_name}, DOB: {dob}")

        try:
            supabase = get_supabase_client()
            response = supabase.table("bookings").select("*").eq("customer_name", customer_name).eq("dob", dob).execute()

            if not response.data:
                return f"No bookings found for {customer_name} with date of birth {dob}."

            # Format bookings for the agent to read
            result = []
            for i, booking in enumerate(response.data, 1):
                booking_id = booking["id"]
                booking_date = booking["booking_date"][:10]  # Extract date part
                room = booking["room_type"]
                days = booking["num_days"]
                features = booking.get("additional_features", {})

                result.append(
                    f"Booking {i}: ID {booking_id}, Room type {room}, "
                    f"Check-in date {booking_date}, Duration {days} days. "
                    f"Features: {features}"
                )

            return " | ".join(result)

        except Exception as e:
            logger.error(f"Error searching bookings: {e}")
            return f"Sorry, I encountered an error while searching for bookings: {e!s}"

    @function_tool(description="""
    Create a new hotel room booking.
    Call this when a customer wants to book a new room.
    """)
    async def create_booking(
        self,
        context: RunContext,
        customer_name: Annotated[str, "The customer's full name"],
        dob: Annotated[str, "The customer's date of birth in YYYY-MM-DD format"],
        booking_date: Annotated[str, "Check-in date in YYYY-MM-DD format"],
        num_days: Annotated[int, "Number of days for the stay"],
        room_type: Annotated[str, "Room type: standard, deluxe, or suite"],
        additional_features: Annotated[str, "Additional features as JSON string, e.g. {'breakfast': true}"]
    ) -> str:
        """Create a new booking"""
        logger.info(f"Creating booking for: {customer_name}, Date: {booking_date}, Room: {room_type}")

        # Validate room type
        valid_rooms = ["standard", "deluxe", "suite"]
        if room_type.lower() not in valid_rooms:
            return f"Invalid room type. Please choose from: {', '.join(valid_rooms)}"

        try:
            supabase = get_supabase_client()

            # Parse additional_features from JSON string to dict if provided
            features_dict = {}
            if additional_features:
                try:
                    features_dict = json.loads(additional_features)
                except json.JSONDecodeError:
                    return "Sorry, there was an error with the additional features format."

            response = supabase.table("bookings").insert({
                "customer_name": customer_name,
                "dob": dob,
                "booking_date": booking_date,
                "num_days": num_days,
                "room_type": room_type.lower(),
                "additional_features": features_dict
            }).execute()

            if response.data:
                booking_id = response.data[0]["id"]
                return f"Booking created successfully! Your booking ID is {booking_id} for a {room_type} room starting {booking_date} for {num_days} days."
            else:
                return "Booking was created but no data returned."

        except Exception as e:
            logger.error(f"Error creating booking: {e}")
            return f"Sorry, I encountered an error while creating the booking: {e!s}"

    @function_tool(description="""
    Update an existing hotel booking.
    Call this when a customer wants to modify their booking dates or room type.
    """)
    async def modify_booking(
        self,
        context: RunContext,
        customer_name: Annotated[str, "The customer's full name"],
        dob: Annotated[str, "The customer's date of birth in YYYY-MM-DD format"],
        booking_id: Annotated[str, "The booking ID to modify"],
        new_booking_date: Annotated[str, "New check-in date in YYYY-MM-DD format (optional)"] = None,
        new_num_days: Annotated[int, "New number of days (optional)"] = None,
        new_room_type: Annotated[str, "New room type: standard, deluxe, or suite (optional)"] = None,
        new_additional_features: Annotated[str, "New additional features as JSON string (optional)"] = None
    ) -> str:
        """Modify an existing booking"""
        logger.info(f"Modifying booking {booking_id} for: {customer_name}")

        try:
            supabase = get_supabase_client()

            # First verify the booking belongs to this customer
            existing = supabase.table("bookings").select("*").eq("id", booking_id).eq("customer_name", customer_name).eq("dob", dob).execute()

            if not existing.data:
                return f"No booking found with ID {booking_id[:8]}... for {customer_name}."

            # Build update payload
            updates = {}
            if new_booking_date:
                updates["booking_date"] = new_booking_date
            if new_num_days:
                updates["num_days"] = new_num_days
            if new_room_type:
                if new_room_type.lower() not in ["standard", "deluxe", "suite"]:
                    return "Invalid room type. Please choose from: standard, deluxe, suite"
                updates["room_type"] = new_room_type.lower()
            if new_additional_features:
                try:
                    updates["additional_features"] = json.loads(new_additional_features)
                except json.JSONDecodeError:
                    return "Sorry, there was an error with the additional features format."

            if not updates:
                return "No changes specified."

            # Perform update
            response = supabase.table("bookings").update(updates).eq("id", booking_id).execute()

            if response.data:
                return f"Booking {booking_id[:8]}... has been updated successfully!"

            return "Booking update completed."

        except Exception as e:
            logger.error(f"Error modifying booking: {e}")
            return f"Sorry, I encountered an error while modifying the booking: {e!s}"

    @function_tool(description="""
    Cancel a hotel booking.
    Call this when a customer wants to cancel their reservation.
    """)
    async def cancel_booking(
        self,
        context: RunContext,
        customer_name: Annotated[str, "The customer's full name"],
        dob: Annotated[str, "The customer's date of birth in YYYY-MM-DD format"],
        booking_id: Annotated[str, "The booking ID to cancel"]
    ) -> str:
        """Cancel an existing booking"""
        logger.info(f"Cancelling booking {booking_id} for: {customer_name}")

        try:
            supabase = get_supabase_client()

            # First verify the booking belongs to this customer
            existing = supabase.table("bookings").select("*").eq("id", booking_id).eq("customer_name", customer_name).eq("dob", dob).execute()

            if not existing.data:
                return f"No booking found with ID {booking_id[:8]}... for {customer_name}."

            # Delete the booking
            supabase.table("bookings").delete().eq("id", booking_id).execute()

            return f"Booking {booking_id[:8]}... has been cancelled successfully."

        except Exception as e:
            logger.error(f"Error cancelling booking: {e}")
            return f"Sorry, I encountered an error while cancelling the booking: {e!s}"


# =============================================================================
# AGENT SERVER SETUP
# =============================================================================

server = AgentServer()


def prewarm(proc: JobProcess):
    """
    Pre-warm the agent by loading the VAD model at startup.
    VAD (Voice Activity Detection) detects when someone is speaking.
    Loading it early makes the first conversation faster.
    """
    proc.userdata["vad"] = silero.VAD.load()
    logger.info("VAD model loaded")


server.setup_fnc = prewarm


@server.rtc_session(agent_name="hotel-agent")
async def hotel_agent_session(ctx: JobContext):
    """
    Main entry point for the agent session.
    This function is called when a user connects via WebRTC.
    """

    # Set up logging context
    ctx.log_context_fields = {
        "room": ctx.room.name,
    }

    logger.info("Starting hotel agent session")

    # Initialize the voice pipeline with Sarvam STT/TTS and Groq LLM

    # Get TTS provider from environment
    tts_provider = os.getenv("TTS_PROVIDER", "sarvam").lower()
    if tts_provider == "minimax":
        tts = minimax.TTS(
            model="speech-2.8-hd",
            voice="English_Gentle-voiced_man",
        )
    else:
        tts = sarvam_tts(
            model="bulbul:v3",
            target_language_code="en-IN",  # English (India)
        )

    session = AgentSession(
        # STT: Speech-to-Text - converts user's voice to text
        # Using Sarvam Saaras v3 for Indian English
        stt=sarvam_stt(
            model="saaras:v3",
            language="en-IN",  # English (India)
        ),

        # LLM: Large Language Model - the agent's brain
        # Using Groq with GPT-OSS-20b for fast, cost-effective inference
        llm=groq.LLM(
            model="openai/gpt-oss-20b",
        ),

        # TTS: Text-to-Speech - converts agent's text response to voice
        tts=tts,

        # VAD: Voice Activity Detection - detects when user is speaking
        vad=ctx.proc.userdata["vad"],

        # Allow agent to start speaking while user is still talking (faster feel)
        preemptive_generation=True,
    )

    # Create the hotel agent
    agent = HotelAgent()

    # Start the session with the agent
    await session.start(
        agent=agent,
        room=ctx.room,
        room_options=room_io.RoomOptions(
            # Enable noise cancellation for cleaner audio
            audio_input=room_io.AudioInputOptions(
                noise_cancellation=True,
            ),
        ),
    )

    # Wait for user to connect
    await ctx.connect()

    logger.info("Agent session started, waiting for user")


if __name__ == "__main__":
    # Run the agent server
    # Use 'uv run python src/agent.py dev' for development
    # Use 'uv run python src/agent.py console' for terminal-only mode
    agents.cli.run_app(server)
