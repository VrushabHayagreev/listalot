require('dotenv').config();
const express = require('express');
const multer = require('multer');
const csv = require('csvtojson');
const { Parser } = require('json2csv');
const OpenAI = require('openai');
const cors = require('cors');
const fs = require('fs');
const { removeBackground } = require('@imgly/background-removal-node');

const app = express();
const upload = multer({ dest: 'uploads/' });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(cors());
app.use(express.json());

// Helper function to send a batch of titles to OpenAI for reduction
async function processBatch(titlesBatch) {
  const prompt = `Reduce each of the following product titles to a maximum of 50 characters, retaining meaningful content without truncation. Titles:\n${titlesBatch.join("\n")}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: "user", content: prompt }],
    max_tokens: 5000,
    temperature: 0.1,
  });

  return response.choices[0].message.content.split('\n').map(title => {
    let cleanedTitle = title.replace(/^\d+\.?\s*/, '').replace(/[^a-zA-Z0-9\s]/g, '').trim();
    return cleanedTitle.length > 50 ? cleanedTitle.substring(0, 50).trim() : cleanedTitle;
  });
}

// Endpoint to process CSV and reduce titles
app.post('/process-csv', upload.single('file'), async (req, res) => {
  try {
    const filePath = req.file.path;
    const jsonArray = await csv().fromFile(filePath);

    const longTitles = [];
    const longTitleIndices = [];
    jsonArray.forEach((item, index) => {
      const cleanedTitle = item.Title.replace(/[,."']/g, '');
      if (cleanedTitle.length > 50) {
        longTitles.push(cleanedTitle);
        longTitleIndices.push(index);
      }
    });

    let condensedTitles = [];
    const batchSize = 200;
    for (let i = 0; i < longTitles.length; i += batchSize) {
      const titlesBatch = longTitles.slice(i, i + batchSize);
      const condensedBatch = await processBatch(titlesBatch);
      condensedTitles = condensedTitles.concat(condensedBatch);
    }

    longTitleIndices.forEach((index, i) => {
      jsonArray[index].Title = condensedTitles[i] || jsonArray[index].Title;
    });
console.log(condensedTitles)
    const json2csvParser = new Parser();
    const csvData = json2csvParser.parse(jsonArray);

    fs.unlinkSync(filePath);

    res.setHeader('Content-Disposition', 'attachment; filename=reduced_titles.csv');
    res.setHeader('Content-Type', 'text/csv');
    res.send(csvData);
  } catch (error) {
    console.error('Error processing CSV:', error);
    res.status(500).json({ error: 'Failed to process CSV' });
  }
});

// Function to remove background from an image file path
async function removeImageBackground(imgPath) {
  try {
    const blob = await removeBackground(imgPath);
    const processedBuffer = Buffer.from(await blob.arrayBuffer());
    const dataURL = `data:image/png;base64,${processedBuffer.toString("base64")}`;
    return { dataURL };
  } catch (error) {
    throw new Error('Error removing background: ' + error);
  }
}

// Function to analyze the image using OpenAI API
async function analyzeImage(dataURL) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Give a brief description of the image, including brand, dimensions, category, and prices on eBay and Amazon. Provide the details in JSON format:\n\n you have to to give all the fields if you dont find a price give a rough price if there are multiple items give rough total if you dont find the brand give an estimated brand or unknown and provide rough dimensions as well" +
                    "{ \"product\": { \"description\": \"a 20 to 30 word description defining what kind of product it is; if branded mention the model as well\", \"brand\": \"\", \"dimensions\": { \"length\": \"\", \"height\": \"\", \"width\": \"\" } in inches, \"category\": \"\" like food clothing etc, \"prices\": { \"eBay\": \"\", \"Amazon\": \"\" absolute single USD price not a range } } }"
            },
            {
              type: "image_url",
              image_url: { "url": dataURL }
            }
          ]
        },
      ],
    });

    return response.choices[0].message.content;
  } catch (error) {
    throw new Error('Error analyzing image with OpenAI: ' + error);
  }
}

// Batch API endpoint to upload multiple images, remove their backgrounds, and analyze them
app.post('/process-images', upload.array('images'), async (req, res) => {
  try {
    const results = [];

    for (const file of req.files) {
      const imgPath = file.path;

      const { dataURL } = await removeImageBackground(imgPath);
      const analysisResult = await analyzeImage(dataURL);

      const cleanedResponse = analysisResult
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .replace(/“|”|‘|’/g, '"')
          .replace(/`/g, '"')
          .replace(/\n/g, '')
          .trim();

      let parsedAnalysis;
      try {
        parsedAnalysis = JSON.parse(cleanedResponse);
      } catch (jsonError) {
        console.error(`Failed to parse JSON for ${imgPath}:`, jsonError);
        parsedAnalysis = { error: "Invalid JSON format in analysis result" };
      }

      results.push({
        dataURL,
        analysis: parsedAnalysis,
      });

      fs.unlinkSync(imgPath);
    }

    res.json({ results });
  } catch (error) {
    console.error('Error in batch processing:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});