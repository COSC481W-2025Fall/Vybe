from pydantic import BaseModel

class UUIDResponse(BaseModel):
    uuid: str

class SlugRequest(BaseModel):
    text: str

class SlugResponse(BaseModel):
    slug: str
