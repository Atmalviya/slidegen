"use server";

import { db } from "@/lib/db";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import axios from "axios";
import { redirect } from "next/navigation";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { DOMParser } from "xmldom";
import { titleAndDescriptionSchema } from "@/zodSchemas";
import pptxgen from "pptxgenjs";
import { randomUUID } from "crypto";
import path from "path";
import os from "os";
import type { UploadFileResult } from "uploadthing/types";
import { UTApi } from "uploadthing/server";
import fs from "fs";
type VideoMetaData = {
  subtitlesURL: string | null;
};

type SubtitleItem = {
  text: string;
};

type TitleAndDescription = z.infer<typeof titleAndDescriptionSchema>;

type slideContent = {
  title: string;
  content: string[];
};

const DEFAULT_SLIDE_COUNT = 10;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-pro" });
const utapi = new UTApi({
  token: process.env.UPLOADTHING_TOKEN,
});

export const generatePowerPoint = async (videoId: string) => {
  try {
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    if (!user || !user.id) {
      redirect("/");
    }
    const dbUser = await db.user.findFirst({
      where: { id: user.id },
    });
    if (!dbUser) {
      redirect("/");
    }
    const { subtitlesURL } = await getVideoSubtitles(videoId);

    if (!subtitlesURL) throw new Error("No subtitle found");
    const parsedSubtitles = await parseXmlContent(subtitlesURL);
    if (!parsedSubtitles) {
      return { success: false, message: "Failed to parse subtitles" };
    }
    const fullText = parsedSubtitles?.map((item) => item.text).join(" ");

    const [titleAndDescription, slideObjects] = await Promise.all([
      createTitleAndDescription(fullText),
      convertToObjects(fullText),
    ]);
    if (!titleAndDescription) {
      return {
        success: false,
        message: "Failed to generate title and description",
      };
    }

    if (!slideObjects) {
      return { success: false, message: "Failed to generate slide objects" };
    }

    const { fileName, filePath } = await CreatePowerPointFromArrayOfObjects(
      titleAndDescription,
      slideObjects,
      user.id,
    );
    console.log({ fileName, filePath });
    const fileBuffer = await fs.promises.readFile(filePath);
    const uploadResult = await uploadPowerPoint(fileBuffer, fileName);
    console.log({ uploadResult });
    if (!uploadResult?.[0].data?.url) {
      return {
        success: false,
        message: "Failed to upload PowerPoint file- no URL returned",
      };
    }

    await db.generatedPowerPoints.create({
      data: {
        link: uploadResult?.[0].data?.url,
        ownerId: user.id,
        title: titleAndDescription.title,
        description: titleAndDescription.description,
      },
    });
    await fs.promises.unlink(filePath);
    return { success: true };
  } catch (error) {
    return { success: false, message: error };
  }
};

export const getVideoSubtitles = async (
  videoId: string,
): Promise<VideoMetaData | null> => {
  try {
    const options = {
      method: "GET",
      url: "https://yt-api.p.rapidapi.com/subtitles",
      params: {
        id: videoId,
      },
      headers: {
        "x-rapidapi-key": process.env.RAPID_API_KEY,
        "x-rapidapi-host": "yt-api.p.rapidapi.com",
      },
    } as const;

    const response = await axios.request(options);
    if (!response.data) {
      throw new Error("No data received from API");
    }
    const englishSubtitle =
      response.data.subtitles.find(
        (subtitle: { languageCode: string }) => subtitle.languageCode === "en",
      )?.url || null;

    return {
      subtitlesURL: englishSubtitle,
    };
  } catch (error) {
    console.log(error);
    throw new Error("Failed to fetch video metadata");
  }
};

export const parseXmlContent = async (
  url: string,
): Promise<SubtitleItem[] | null> => {
  try {
    const response = await axios.get(url);
    const parser = new DOMParser();
    const doc = parser.parseFromString(response.data, "application/xml");
    const textElements = doc.getElementsByTagName("text");
    const textArry = Array.from(textElements).map((element) => ({
      text: element.textContent || "",
    }));
    return textArry;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const createTitleAndDescription = async (
  transcript: string,
): Promise<TitleAndDescription | undefined> => {
  const promptTemplate = `Generate a concise title and description for a presentation based on the provided transcript and requirements. Please correct any minor inconsistencies in the input as needed to ensure a coherent response.

      Requirements:
      - The title should be a maximum of 10 words, starting with "Title: " followed by the presentation title.
      - The description should be a maximum of 20 words, starting with "Description: " followed by a brief summary of the presentation.
      - Focus on capturing the content of the presentation rather than details about the speaker.
      - Ensure the response is in English.
      - Do not use formatting (e.g., bold, italics) or mention the word "video."
      - Make sure all requirements above are met in the response.

      Transcript: ${transcript}`;
  try {
    const result = await model.generateContent(promptTemplate);
    const res = result.response.candidates[0].content.parts[0].text;

    const titleMatch = res.match(/Title:\s*(.*)/);
    const descriptionMatch = res.match(/Description:\s*(.*)/);

    if (titleMatch && descriptionMatch) {
      return {
        title: titleMatch[1].trim(),
        description: descriptionMatch[1].trim(),
      };
    }
    throw new Error("Failed to generate valid title and description");
  } catch (error) {
    console.log(error);
    throw new Error(
      "Something went wrong while generating title and description",
    );
  }
};

export const convertToObjects = async (
  text: string,
  slideCount = DEFAULT_SLIDE_COUNT,
): Promise<slideContent[] | null> => {
  const promptTemplate = `Create a PowerPoint presentation outline with exactly ${slideCount} slides based on the following text. Format your response as a JSON array where each slide is an object with a "title" and "content" field. The content field should be an array of up to 4 bullet points.

      Example format:
      [
        {
          "title": "Slide Title about the topic",
          "content": ["Bullet point 1", "Bullet point 2"]
        }
      ]

      Requirements:
      - Exactly ${slideCount} slides
      - Each slide must have 2-3 bullet points.
      - Each bullet point should have 200-300 words.
      - Response must be valid JSON
      - No markdown formatting or extra text
      - Only include the JSON array

      Text to process: ${text}`;

  try {
    const result = await model.generateContent(promptTemplate);
    const res = result.response.candidates[0].content.parts[0].text;

    // Clean up the response to ensure valid JSON
    let cleanedResponse = res
      .replace(/```json\s*|\s*```/gi, "") // Remove code blocks
      .replace(/[\u201C\u201D]/g, '"') // Replace smart quotes
      .replace(/[\u2018\u2019]/g, "'") // Replace smart single quotes
      .trim();

    // Ensure the response starts with [ and ends with ]
    if (!cleanedResponse.startsWith("[")) {
      cleanedResponse = "[" + cleanedResponse;
    }
    if (!cleanedResponse.endsWith("]")) {
      cleanedResponse = cleanedResponse + "]";
    }

    try {
      const parsedResponse = JSON.parse(cleanedResponse);

      // Validate the structure
      if (Array.isArray(parsedResponse)) {
        const validSlides = parsedResponse.filter(
          (slide): slide is slideContent =>
            typeof slide === "object" &&
            slide !== null &&
            typeof slide.title === "string" &&
            Array.isArray(slide.content) &&
            slide.content.every((item) => typeof item === "string"),
        );

        // Ensure we have the correct number of slides
        if (validSlides.length === slideCount) {
          return validSlides;
        }
      }
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      console.error("Attempted to parse:", cleanedResponse);
    }

    // If we get here, either parsing failed or validation failed
    throw new Error("Failed to generate valid slide objects");
  } catch (error) {
    console.error("Error generating slide content:", error);
    return null;
  }
};

export const CreatePowerPointFromArrayOfObjects = async (
  titleAndDescription: TitleAndDescription,
  slides: slideContent[],
  userId: string,
) => {
  const pptx = new pptxgen();
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: "#ffffff" };
  titleSlide.addText(titleAndDescription.title, {
    x: 0,
    y: "40%",
    w: "100%",
    h: 1,
    fontSize: 33,
    bold: true,
    color: "003366",
    align: "center",
    fontFace: "Helvetica",
  });

  titleSlide.addText(titleAndDescription.description, {
    x: 0,
    y: "58%",
    w: "100%",
    h: 0.75,
    fontSize: 18,
    color: "888888",
    align: "center",
    fontFace: "Helvetica",
  });

  slides.forEach(({ title, content }) => {
    const slide = pptx.addSlide();
    slide.addText(title, {
      x: 0.5,
      y: 0.5,
      w: 8.5,
      h: 1,
      fontSize: 32,
      bold: true,
      color: "003366",
      align: "center",
      fontFace: "Arial",
    });
    content.forEach((bullet, index) => {
      slide.addText(bullet, {
        x: 1,
        y: 1.8 + index * 1,
        w: 8,
        h: 0.75,
        fontSize: 15,
        color: "333333",
        align: "left",
        fontFace: "Arial",
        bullet: true,
      });
    });
  });

  try {
    const fileName = `presentation-${randomUUID()}-user-${userId}.pptx`;
    const filePath = path.join(os.tmpdir(), fileName);
    await pptx.writeFile({ fileName: filePath });
    return { fileName, filePath };
  } catch (error) {
    console.log(error);
    throw new Error("Failed to create PowerPoint file");
  }
};

export const uploadPowerPoint = async (
  fileBuffer: Buffer,
  fileName: string,
): Promise<UploadFileResult[] | null> => {
  try {
    // console.log(fileBuffer, fileName);
    const file = new File([fileBuffer], fileName, {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });
    const response = await utapi.uploadFiles([file]);
    console.log({ response });
    if (!response?.[0].data?.url) {
      throw new Error("Failed to upload file");
    }
    console.log(response?.[0].data?.url);
    return response;
  } catch (error) {
    console.error("Upload error details:", {
      error,
      fileName,
      bufferSize: fileBuffer.length,
    });
    throw new Error(`Failed to upload PowerPoint file: ${error.message}`);
  }
};
