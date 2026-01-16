"""
Database Models Package
Exports all SQLAlchemy models for the FareShare application.
"""
from datetime import datetime
from sqlalchemy import inspect
from sqlalchemy.orm.exc import DetachedInstanceError
from uuid import UUID
from sqlalchemy.ext.declarative import declarative_base
from src.models.user import User
from src.models.ride import Ride
from src.models.booking import Booking
from src.models.review import Review
from src.models.incident import Incident

__all__ = ["User", "Ride", "Booking", "Review", "Incident"]

class ModelJSONMixin:
    """
    Mixin class to add toJson method to all SQLAlchemy models
    This allows easy serialization of models to JSON for API responses
    """
    def toJson(self, include_relationships=False):
        """
        Convert model instance to a dictionary suitable for JSON serialization
        
        Args:
            include_relationships (bool): Whether to include relationships in the output
                                         Default is False to prevent circular references
        """
        # Get all columns from the model
        mapper = inspect(self.__class__)
        columns = [column.key for column in mapper.columns]
        
        # Create dictionary with all column values
        data = {}
        
        # Add column values
        for column in columns:
            value = getattr(self, column)
            
            # Handle special types that aren't JSON serializable
            if isinstance(value, datetime):
                data[column] = value.isoformat()
            elif isinstance(value, UUID):
                data[column] = str(value)
            elif hasattr(value, '__geo_interface__'):
                # Handle PostGIS geometry types
                geo_interface = value.__geo_interface__
                if geo_interface['type'] == 'Point':
                    # Convert to [lng, lat] format for GeoJSON
                    data[column] = {
                        'type': 'Point',
                        'coordinates': geo_interface['coordinates']
                    }
                else:
                    data[column] = geo_interface
            else:
                data[column] = value
        
        # Optionally include relationships
        if include_relationships:
            relationships = [rel.key for rel in mapper.relationships]
            for rel in relationships:
                try:
                    rel_obj = getattr(self, rel)
                    
                    # Handle collections (one-to-many, many-to-many)
                    if hasattr(rel_obj, '__iter__') and not isinstance(rel_obj, (str, bytes)):
                        # Limit to first 5 items to prevent huge JSON responses
                        data[rel] = [item.toJson(include_relationships=False) for item in list(rel_obj)[:5]]
                        if len(rel_obj) > 5:
                            data[f"{rel}_count"] = len(rel_obj)
                    # Handle single objects (many-to-one, one-to-one)
                    elif rel_obj is not None:
                        data[rel] = rel_obj.toJson(include_relationships=False)
                    else:
                        data[rel] = None
                except (DetachedInstanceError, Exception) as e:
                    # Skip relationships that can't be loaded
                    data[rel] = f"Error loading relationship: {str(e)}"
                
        return data
