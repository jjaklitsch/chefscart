#!/usr/bin/env python3
import struct

def extract_zip_codes_from_dbf(filename):
    zip_codes = []
    
    with open(filename, 'rb') as f:
        # Read header
        header = f.read(32)
        record_count = struct.unpack('<I', header[4:8])[0]
        header_len = struct.unpack('<H', header[8:10])[0]
        record_len = struct.unpack('<H', header[10:12])[0]
        
        print(f"Processing {record_count} records...")
        
        # Skip to data records
        f.seek(header_len)
        
        for i in range(record_count):
            # Read record
            record = f.read(record_len)
            
            # Skip deletion flag (first byte)
            if record[0:1] == b' ':  # Not deleted
                # ZCTA5CE20 is first field, 5 characters
                zip_code = record[1:6].decode('ascii').strip()
                if zip_code and zip_code.isdigit() and len(zip_code) == 5:
                    zip_codes.append(zip_code)
            
            if i % 5000 == 0:
                print(f"Processed {i} records...")
    
    return sorted(list(set(zip_codes)))

# Extract ZIP codes
zip_codes = extract_zip_codes_from_dbf('tl_2022_us_zcta520.dbf')

print(f"\n✅ Extracted {len(zip_codes)} unique ZIP codes")
print(f"📍 Range: {zip_codes[0]} to {zip_codes[-1]}")

# Save to file
with open('official_us_zip_codes.txt', 'w') as f:
    for zip_code in zip_codes:
        f.write(zip_code + '\n')

print(f"💾 Saved to official_us_zip_codes.txt")

# Show some sample ZIP codes
print(f"\nSample ZIP codes:")
for i in range(0, min(20, len(zip_codes))):
    print(f"  {zip_codes[i]}")
print("  ...")
for i in range(max(0, len(zip_codes)-5), len(zip_codes)):
    print(f"  {zip_codes[i]}")