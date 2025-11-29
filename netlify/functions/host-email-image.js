const fetch = require('node-fetch');
const FormData = require('form-data');

/*
 * Netlify Function: host-email-image
 *
 * This function accepts a JSON payload with the following properties:
 *   - source_url: (string, required) a publicly accessible URL of the image to host.
 *   - filename:   (string, optional) base filename for the uploaded asset.
 *   - usage:      (string, optional) a hint about how the image will be used, e.g. "header".
 *
 * The function will attempt to upload the image to Cloudinary if the
 * environment variables CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET
 * are defined. In that case it returns the secure URL of the uploaded asset.
 *
 * If Cloudinary is not configured, it falls back to encoding the image
 * as a data URI and returns that instead. This ensures that images can
 * still be embedded in HTML emails without requiring external hosting.
 */

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed',
    };
  }

  try {
    const { source_url, filename = 'email-asset', usage } = JSON.parse(event.body || '{}');
    if (!source_url) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'source_url is required' }),
      };
    }

    // Fetch the image from the provided URL
    const response = await fetch(source_url);
    if (!response.ok) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: `Failed to fetch source_url: ${response.status} ${response.statusText}`,
        }),
      };
    }
    const buffer = await response.buffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // If Cloudinary configuration is present, upload the image
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;
    if (cloudName && uploadPreset) {
      try {
        const form = new FormData();
        form.append('file', buffer, { filename: `${filename}.jpg` });
        form.append('upload_preset', uploadPreset);
        // Optionally specify a folder based on usage
        if (usage) {
          form.append('folder', `email-assets/${usage}`);
        } else {
          form.append('folder', 'email-assets');
        }
        const uploadRes = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          {
            method: 'POST',
            body: form,
          }
        );
        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(
            uploadJson.error && uploadJson.error.message
              ? uploadJson.error.message
              : 'Cloudinary upload failed'
          );
        }
        return {
          statusCode: 200,
          body: JSON.stringify({ url: uploadJson.secure_url }),
        };
      } catch (uploadErr) {
        // Fall through to data URI fallback if Cloudinary upload fails
        console.warn('Cloudinary upload failed, falling back to data URI:', uploadErr);
      }
    }

    // Fallback: Convert to a data URI
    const base64 = buffer.toString('base64');
    const dataUri = `data:${contentType};base64,${base64}`;
    return {
      statusCode: 200,
      body: JSON.stringify({ url: dataUri }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to process image', details: String(err) }),
    };
  }
};
