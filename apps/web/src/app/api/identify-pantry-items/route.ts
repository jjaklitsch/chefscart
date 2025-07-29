import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('photos') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({
        error: 'No photos provided'
      }, { status: 400 })
    }

    // Validate that all files are actual File objects and are images
    const validFiles = files.filter(file => {
      if (!(file instanceof File)) {
        console.warn('Invalid file object:', file)
        return false
      }
      
      // Log file info for debugging
      console.log('Validating file:', {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified
      })
      
      const isHeic = file.type === 'image/heic' || file.type === 'image/heif' ||
                    file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')
      
      if (!file.type.startsWith('image/') && 
          !isHeic &&
          !file.name.toLowerCase().endsWith('.jpg') &&
          !file.name.toLowerCase().endsWith('.jpeg') &&
          !file.name.toLowerCase().endsWith('.png') &&
          !file.name.toLowerCase().endsWith('.webp')) {
        console.warn('Non-image file:', file.type, file.name)
        return false
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        console.warn('File too large:', file.size)
        return false
      }
      
      if (isHeic) {
        console.log('✅ HEIC file detected and validated:', file.name)
      }
      
      return true
    })

    if (validFiles.length === 0) {
      return NextResponse.json({
        error: 'No valid image files provided'
      }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        error: 'OpenAI API key not configured'
      }, { status: 500 })
    }

    console.log(`Analyzing ${validFiles.length} photos for pantry items`)

    // Convert images to base64 for GPT-4 Vision
    const imagePromises = validFiles.map(async (file, index) => {
      try {
        const buffer = await file.arrayBuffer()
        
        // Handle HEIC files - convert them to JPEG
        let mimeType = file.type || ''
        let processedBuffer = buffer
        
        // Check if it's a HEIC file
        const isHeic = mimeType === 'image/heic' || mimeType === 'image/heif' || 
                      file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')
        
        if (isHeic) {
          console.log(`🔄 Converting HEIF/HEIC file to PNG using Sharp: ${file.name} (${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB)`)
          try {
            // Use sharp to convert HEIF/HEIC to PNG
            const pngBuffer = await sharp(Buffer.from(buffer))
              .png({ quality: 90, compressionLevel: 6 })
              .toBuffer()
            
            if (!pngBuffer || pngBuffer.byteLength === 0) {
              throw new Error('Sharp conversion returned empty buffer')
            }
            
            // Validate the converted buffer is actually a valid PNG
            const pngHeader = pngBuffer.toString('hex', 0, 8)
            if (!pngHeader.startsWith('89504e47')) { // PNG magic number
              throw new Error('Converted buffer is not a valid PNG')
            }
            
            processedBuffer = pngBuffer
            mimeType = 'image/png'
            console.log(`✅ Successfully converted HEIF/HEIC to PNG: ${file.name} (${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB → ${(pngBuffer.byteLength / 1024 / 1024).toFixed(1)}MB)`)
          } catch (convertError) {
            console.error(`❌ Failed to convert HEIF/HEIC file ${file.name}:`, convertError)
            console.error('Error details:', {
              message: convertError instanceof Error ? convertError.message : convertError,
              stack: convertError instanceof Error ? convertError.stack?.toString() : undefined,
              fileSize: buffer.byteLength,
              fileName: file.name,
              mimeType: file.type
            })
            
            // Try one more time with sharp's HEIF input format explicitly
            try {
              console.log(`🔄 Retry: Attempting conversion with explicit HEIF input format`)
              const pngBuffer = await sharp(Buffer.from(buffer), { failOnError: false })
                .png()
                .toBuffer()
                
              processedBuffer = pngBuffer
              mimeType = 'image/png'
              console.log(`✅ Successfully converted on retry: ${file.name}`)
            } catch (retryError) {
              console.error(`❌ Retry also failed:`, retryError instanceof Error ? retryError.message : retryError)
              console.warn(`⚠️  Skipping HEIF/HEIC file ${file.name} due to conversion failure`)
              return null
            }
          }
        }
        
        // Ensure we have a valid image MIME type
        if (!mimeType.startsWith('image/')) {
          // Try to infer from file extension
          const ext = file.name.toLowerCase().split('.').pop()
          switch (ext) {
            case 'jpg':
            case 'jpeg':
              mimeType = 'image/jpeg'
              break
            case 'png':
              mimeType = 'image/png'
              break
            case 'webp':
              mimeType = 'image/webp'
              break
            default:
              console.warn(`Unknown file type for ${file.name}, defaulting to image/jpeg`)
              mimeType = 'image/jpeg'
          }
        }
        
        console.log(`Processing image ${index + 1}: ${file.name} (${mimeType}) - ${(file.size / 1024 / 1024).toFixed(1)}MB`)
        
        // Convert processed buffer to base64
        const base64 = Buffer.from(processedBuffer).toString('base64')
        
        return {
          type: "image_url",
          image_url: {
            url: `data:${mimeType};base64,${base64}`,
            detail: "low" // Use low detail for faster processing
          }
        }
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error)
        return null
      }
    })

    const images = (await Promise.all(imagePromises)).filter(img => img !== null)
    
    console.log(`📊 Image processing results: ${images.length} successful out of ${validFiles.length} total files`)
    
    if (images.length === 0) {
      // Log which files failed for debugging
      const failedFiles = validFiles.map(f => `${f.name} (${f.type || 'no-type'}, ${(f.size / 1024 / 1024).toFixed(1)}MB)`)
      console.error('❌ All image processing failed. Files:', failedFiles)
      
      return NextResponse.json({
        success: true,
        items: [],
        message: 'Unable to process the uploaded images. If uploading HEIC files, please try converting them to JPG first, or try uploading JPG/PNG files.'
      })
    }

    // Prepare the vision API call
    const messages = [
      {
        role: "system",
        content: "You are a pantry inventory assistant. Your job is to identify ONLY the actual raw ingredients, packaged foods, and pantry items that are clearly visible in photos. Do NOT infer, assume, or guess what might have been used to prepare dishes. Only list items you can actually see. For quantities, focus on containers/packages, not individual items (e.g., '1 box' not '30 berries')."
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Look at these pantry/fridge photos and identify items with their quantities. Focus on:
- Fresh produce (count bunches, bags, or containers)
- Packaged goods (boxes, cans, jars, bottles)
- Dairy products (cartons, containers)
- Proteins (packages, not individual pieces)

Return a JSON array where each item has:
- "name": the item name
- "quantity": the count (default to 1 if unclear)
- "unit": the container type (box, can, jar, bottle, carton, bag, bunch, package, container, etc.)

Example: [{"name": "Blueberries", "quantity": 1, "unit": "container"}, {"name": "Milk", "quantity": 1, "unit": "carton"}]

Be conservative - only list what you can clearly see. If you can't determine the quantity, use 1.`
          },
          ...images
        ]
      }
    ]

    // Make the API call to GPT-4 Vision
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // GPT-4o-mini supports vision and is more cost-effective
        messages,
        max_tokens: 1000,
        temperature: 0.3,
        response_format: { type: "json_object" }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`OpenAI API error ${response.status}:`, errorText)
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      throw new Error('No content returned from vision analysis')
    }

    // Parse the JSON response
    let parsedItems = []
    try {
      const jsonResponse = JSON.parse(content)
      // Handle both array format and object with items property
      parsedItems = Array.isArray(jsonResponse) ? jsonResponse : (jsonResponse.items || [])
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError)
      console.log('Raw response:', content)
      
      // Fallback: try to extract items from the text
      const items = content.match(/[\w\s]+/g) || []
      parsedItems = items.map((item: string) => ({
        name: item.trim(),
        quantity: 1,
        unit: 'item'
      }))
    }

    // Validate and clean up items
    const identifiedItems = parsedItems
      .filter((item: any) => item.name && typeof item.name === 'string')
      .map((item: any) => ({
        name: item.name.trim(),
        quantity: parseInt(item.quantity) || 1,
        unit: item.unit || 'item'
      }))
      .slice(0, 30) // Limit to 30 items max

    console.log(`✅ Identified ${identifiedItems.length} pantry items with quantities`)

    return NextResponse.json({
      success: true,
      items: identifiedItems,
      raw_response: content
    })

  } catch (error) {
    console.error('Error analyzing pantry photos:', error)
    
    // If OpenAI Vision fails, return a helpful fallback
    if (error instanceof Error && error.message.includes('OpenAI API error')) {
      return NextResponse.json({
        success: true,
        items: [], // Return empty array so user can add items manually
        fallback: true,
        message: 'AI analysis temporarily unavailable. Please add items manually.'
      })
    }
    
    return NextResponse.json({
      error: 'Failed to analyze photos',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}