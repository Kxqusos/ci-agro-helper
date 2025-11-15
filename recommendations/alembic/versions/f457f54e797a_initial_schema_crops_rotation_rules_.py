"""Initial schema: crops, rotation rules, soil requirements, field history

Revision ID: f457f54e797a
Revises:
Create Date: 2025-11-14 11:28:02.547484

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'f457f54e797a'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create enums
    op.execute("CREATE TYPE data_confidence_enum AS ENUM ('высокая', 'средняя', 'низкая', 'отсутствует')")
    op.execute("CREATE TYPE organic_matter_level_enum AS ENUM ('низкая', 'средняя', 'высокая')")
    op.execute("CREATE TYPE drainage_level_enum AS ENUM ('плохой', 'средний', 'хороший')")
    op.execute("CREATE TYPE nutrient_impact_enum AS ENUM ('сильное_истощение', 'истощение', 'нейтральное', 'обогащение', 'сильное_обогащение')")
    op.execute("CREATE TYPE relationship_type_enum AS ENUM ('good', 'acceptable', 'bad')")
    op.execute("CREATE TYPE predecessor_rating_enum AS ENUM ('excellent', 'good')")
    op.execute("CREATE TYPE predecessor_type_enum AS ENUM ('crop', 'family')")

    # Create sources table
    op.create_table(
        'sources',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('source_id', sa.String(length=100), nullable=False),
        sa.Column('title', sa.String(length=500), nullable=False),
        sa.Column('authors', sa.String(length=500), nullable=True),
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('url', sa.String(length=1000), nullable=True),
        sa.Column('isbn', sa.String(length=50), nullable=True),
        sa.Column('doi', sa.String(length=200), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('source_id')
    )
    op.create_index(op.f('ix_sources_source_id'), 'sources', ['source_id'], unique=False)

    # Create botanical_families table
    op.create_table(
        'botanical_families',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('family_key', sa.String(length=50), nullable=False),
        sa.Column('name_ru', sa.String(length=200), nullable=False),
        sa.Column('name_latin', sa.String(length=200), nullable=False),
        sa.Column('common_pests', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('common_diseases', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('family_key')
    )
    op.create_index(op.f('ix_botanical_families_family_key'), 'botanical_families', ['family_key'], unique=False)

    # Create crops table
    op.create_table(
        'crops',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('crop_id', sa.Integer(), nullable=False),
        sa.Column('crop_name', sa.String(length=200), nullable=False),
        sa.Column('crop_latin', sa.String(length=200), nullable=True),
        sa.Column('botanical_family_key', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['botanical_family_key'], ['botanical_families.family_key'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('crop_id')
    )
    op.create_index(op.f('ix_crops_botanical_family'), 'crops', ['botanical_family_key'], unique=False)
    op.create_index(op.f('ix_crops_crop_id'), 'crops', ['crop_id'], unique=False)

    # Create crop_rotation_rules table
    op.create_table(
        'crop_rotation_rules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('crop_id', sa.Integer(), nullable=False),
        sa.Column('return_interval_min', sa.Integer(), nullable=False),
        sa.Column('return_interval_recommended', sa.Integer(), nullable=False),
        sa.Column('incompatible_families', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('data_confidence', postgresql.ENUM('высокая', 'средняя', 'низкая', 'отсутствует', name='data_confidence_enum', create_type=False), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint('return_interval_min > 0', name='check_return_interval_min_positive'),
        sa.CheckConstraint('return_interval_recommended >= return_interval_min', name='check_return_interval_recommended_gte_min'),
        sa.ForeignKeyConstraint(['crop_id'], ['crops.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('crop_id')
    )

    # Create soil_requirements table
    op.create_table(
        'soil_requirements',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('crop_id', sa.Integer(), nullable=False),
        sa.Column('ph_min', sa.Numeric(precision=3, scale=1), nullable=True),
        sa.Column('ph_max', sa.Numeric(precision=3, scale=1), nullable=True),
        sa.Column('ph_optimal', sa.Numeric(precision=3, scale=1), nullable=True),
        sa.Column('soil_types', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('organic_matter', postgresql.ENUM('низкая', 'средняя', 'высокая', name='organic_matter_level_enum', create_type=False), nullable=True),
        sa.Column('drainage', postgresql.ENUM('плохой', 'средний', 'хороший', name='drainage_level_enum', create_type=False), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint('ph_min >= 0 AND ph_min <= 14', name='check_ph_min_range'),
        sa.CheckConstraint('ph_max >= 0 AND ph_max <= 14', name='check_ph_max_range'),
        sa.CheckConstraint('ph_optimal >= 0 AND ph_optimal <= 14', name='check_ph_optimal_range'),
        sa.CheckConstraint('ph_min IS NULL OR ph_max IS NULL OR ph_min <= ph_max', name='check_ph_min_lte_max'),
        sa.ForeignKeyConstraint(['crop_id'], ['crops.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('crop_id')
    )

    # Create nutrient_impact table
    op.create_table(
        'nutrient_impact',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('crop_id', sa.Integer(), nullable=False),
        sa.Column('nitrogen', postgresql.ENUM('сильное_истощение', 'истощение', 'нейтральное', 'обогащение', 'сильное_обогащение', name='nutrient_impact_enum', create_type=False), nullable=True),
        sa.Column('phosphorus', postgresql.ENUM('сильное_истощение', 'истощение', 'нейтральное', 'обогащение', 'сильное_обогащение', name='nutrient_impact_enum', create_type=False), nullable=True),
        sa.Column('potassium', postgresql.ENUM('сильное_истощение', 'истощение', 'нейтральное', 'обогащение', 'сильное_обогащение', name='nutrient_impact_enum', create_type=False), nullable=True),
        sa.Column('organic_matter', postgresql.ENUM('сильное_истощение', 'истощение', 'нейтральное', 'обогащение', 'сильное_обогащение', name='nutrient_impact_enum', create_type=False), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['crop_id'], ['crops.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('crop_id')
    )

    # Create crop_predecessors table
    op.create_table(
        'crop_predecessors',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('crop_id', sa.Integer(), nullable=False),
        sa.Column('predecessor_id', sa.String(length=100), nullable=False),
        sa.Column('predecessor_type', postgresql.ENUM('crop', 'family', name='predecessor_type_enum', create_type=False), nullable=False),
        sa.Column('relationship_type', postgresql.ENUM('good', 'acceptable', 'bad', name='relationship_type_enum', create_type=False), nullable=False),
        sa.Column('rating', postgresql.ENUM('excellent', 'good', name='predecessor_rating_enum', create_type=False), nullable=True),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('conditions', sa.Text(), nullable=True),
        sa.Column('sources', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['crop_id'], ['crops.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('crop_id', 'predecessor_id', 'predecessor_type', name='uq_crop_predecessor')
    )
    op.create_index(op.f('ix_crop_predecessors_crop_id'), 'crop_predecessors', ['crop_id'], unique=False)
    op.create_index(op.f('ix_crop_predecessors_type'), 'crop_predecessors', ['relationship_type'], unique=False)

    # Create field_history table
    op.create_table(
        'field_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('field_id', sa.String(length=100), nullable=False),
        sa.Column('crop_id', sa.Integer(), nullable=False),
        sa.Column('planting_date', sa.Date(), nullable=False),
        sa.Column('harvest_date', sa.Date(), nullable=True),
        sa.Column('yield_amount', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('yield_unit', sa.String(length=50), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint('harvest_date IS NULL OR harvest_date >= planting_date', name='check_harvest_after_planting'),
        sa.CheckConstraint('yield_amount IS NULL OR yield_amount >= 0', name='check_yield_positive'),
        sa.ForeignKeyConstraint(['crop_id'], ['crops.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_field_history_crop_id'), 'field_history', ['crop_id'], unique=False)
    op.create_index(op.f('ix_field_history_field_id'), 'field_history', ['field_id'], unique=False)
    op.create_index(op.f('ix_field_history_planting_date'), 'field_history', ['planting_date'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop tables in reverse order
    op.drop_index(op.f('ix_field_history_planting_date'), table_name='field_history')
    op.drop_index(op.f('ix_field_history_field_id'), table_name='field_history')
    op.drop_index(op.f('ix_field_history_crop_id'), table_name='field_history')
    op.drop_table('field_history')

    op.drop_index(op.f('ix_crop_predecessors_type'), table_name='crop_predecessors')
    op.drop_index(op.f('ix_crop_predecessors_crop_id'), table_name='crop_predecessors')
    op.drop_table('crop_predecessors')

    op.drop_table('nutrient_impact')
    op.drop_table('soil_requirements')
    op.drop_table('crop_rotation_rules')

    op.drop_index(op.f('ix_crops_crop_id'), table_name='crops')
    op.drop_index(op.f('ix_crops_botanical_family'), table_name='crops')
    op.drop_table('crops')

    op.drop_index(op.f('ix_botanical_families_family_key'), table_name='botanical_families')
    op.drop_table('botanical_families')

    op.drop_index(op.f('ix_sources_source_id'), table_name='sources')
    op.drop_table('sources')

    # Drop enums
    op.execute("DROP TYPE IF EXISTS predecessor_type_enum")
    op.execute("DROP TYPE IF EXISTS predecessor_rating_enum")
    op.execute("DROP TYPE IF EXISTS relationship_type_enum")
    op.execute("DROP TYPE IF EXISTS nutrient_impact_enum")
    op.execute("DROP TYPE IF EXISTS drainage_level_enum")
    op.execute("DROP TYPE IF EXISTS organic_matter_level_enum")
    op.execute("DROP TYPE IF EXISTS data_confidence_enum")
