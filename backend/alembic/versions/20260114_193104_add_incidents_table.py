"""add incidents table

Revision ID: 20260114_193104
Revises: (previous revision)
Create Date: 2026-01-14 19:31:04

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision = '20260114_193104'
down_revision = None  # Update this to reference your latest migration
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create incidents table"""
    op.create_table(
        'incidents',
        sa.Column('id', UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), primary_key=True, comment='Unique incident identifier (UUID)'),
        sa.Column('reporter_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, comment='User who filed the incident report'),
        sa.Column('reported_user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, comment='User being reported for the incident'),
        sa.Column('ride_id', UUID(as_uuid=True), sa.ForeignKey('rides.id', ondelete='CASCADE'), nullable=False, comment='Ride where the incident occurred'),
        sa.Column('booking_id', UUID(as_uuid=True), sa.ForeignKey('bookings.id', ondelete='CASCADE'), nullable=False, comment='Booking that connects the reporter and reported user'),
        sa.Column('category', sa.String(50), nullable=False, comment='Incident category: safety, harassment, property, other'),
        sa.Column('description', sa.Text, nullable=False, comment='Detailed description of what happened'),
        sa.Column('status', sa.String(20), nullable=False, server_default='open', comment='Current status: open, reviewed, resolved, dismissed'),
        sa.Column('admin_notes', sa.Text, nullable=True, comment='Internal notes from admin reviewing the incident'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(), comment='When the incident was reported'),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now(), comment='Last update to incident status or admin notes'),
    )
    
    # Create indexes
    op.create_index('ix_incidents_reporter_id', 'incidents', ['reporter_id'])
    op.create_index('ix_incidents_reported_user_id', 'incidents', ['reported_user_id'])
    op.create_index('ix_incidents_ride_id', 'incidents', ['ride_id'])
    op.create_index('ix_incidents_status', 'incidents', ['status'])
    op.create_index('ix_incidents_status_created', 'incidents', ['status', 'created_at'])


def downgrade() -> None:
    """Drop incidents table"""
    op.drop_index('ix_incidents_status_created', table_name='incidents')
    op.drop_index('ix_incidents_status', table_name='incidents')
    op.drop_index('ix_incidents_ride_id', table_name='incidents')
    op.drop_index('ix_incidents_reported_user_id', table_name='incidents')
    op.drop_index('ix_incidents_reporter_id', table_name='incidents')
    op.drop_table('incidents')
