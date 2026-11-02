# Product photos

Each SKU supports up to six optional photos. New SKU form accepts photos before save; existing SKU rows have a Foto button for a gallery editor with add/remove/save/cancel. First photo is a lazy-loaded table thumbnail. Only supported JPEG/PNG/WebP raster uploads are accepted, with 5 MB input limit per file and 40 megapixel decoded-image limit.

Processing is sequential in the browser. Photos are resized to at most 1200 pixels on the longest side without upscaling, flattened on white and compressed with WebP encoding (JPEG/PNG fallback via browser canvas where applicable), trying quality levels and smaller dimensions until output is at most 300 KiB. At most 1.8 MiB compressed image bytes per SKU; runtime/rendering overhead is additional. Failed batches do not add partial photos. Decoded bitmaps are closed and temporary object URLs revoked on cancellation/removal/reset; saved photos retain their URLs until session ends. Reset/cancel invalidates pending work. Files are not sent to a third-party service.

Storage remains page-session memory with object URLs, not a persistent image server. Reload loses demo photos. Production object storage, backend validation/resize and authorization remain future work.
