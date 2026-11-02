import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePhotoSelection,fittedSize,PHOTO_MAX_BYTES,PHOTO_MAX_SIDE } from './product-photos.js';
test('photos enforce six total slots, input size and supported raster formats',()=>{const file={type:'image/jpeg',size:1024};validatePhotoSelection(5,[file]);assert.throws(()=>validatePhotoSelection(5,[file,file]));assert.throws(()=>validatePhotoSelection(0,[{type:'image/svg+xml',size:100}]));assert.throws(()=>validatePhotoSelection(0,[{type:'image/png',size:6*1024*1024}]));assert.equal(PHOTO_MAX_BYTES,307200);});
test('resizing fits 1200 px preserving orientation and never upscales',()=>{assert.deepEqual(fittedSize(4000,3000),{width:1200,height:900});assert.deepEqual(fittedSize(2000,4000),{width:600,height:1200});assert.deepEqual(fittedSize(200,100),{width:200,height:100});assert.equal(PHOTO_MAX_SIDE,1200);});
