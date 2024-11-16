"use server";

import { db } from "@/lib/db";
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
import { currentUser } from "@clerk/nextjs/server";
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
    const user = await currentUser();
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
): Promise<VideoMetaData> => {
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
    const res = result.response?.candidates?.[0]?.content?.parts?.[0]?.text;

    const titleMatch = res?.match(/Title:\s*(.*)/);
    const descriptionMatch = res?.match(/Description:\s*(.*)/);

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
  const promptTemplate = `Create a PowerPoint presentation outline with exactly ${slideCount} slides based on the following text. Format your response as a JSON array where each slide is an object with a "title" and "content" field. The content field must be an array with 2-3 bullet points.

      Requirements:
      - Exactly ${slideCount} slides
      - Each slide MUST have 2-3 bullet points (this is required)
      - Each bullet point should be clear and concise
      - Response must be valid JSON array only
      - No markdown, code blocks, or extra text

      Example format:
      [
        {
          "title": "Slide Title",
          "content": [
            "First bullet point with important information",
            "Second bullet point with additional details",
            "Third bullet point with concluding information"
          ]
        }
      ]

      Text to process: ${text}`;

  try {
    const result = await model.generateContent(promptTemplate);
    const res = result.response?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!res) {
      throw new Error("Empty response from AI model");
    }

    const cleanedResponse = res
      .replace(/```(?:json)?\s*|\s*```/gi, "")
      .replace(/^\s*\[\s*\[/, "[")
      .replace(/\]\s*\]\s*$/, "]")
      .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
      .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/[\u2026]/g, "...")
      .trim();

    try {
      const parsedResponse = JSON.parse(cleanedResponse);

      if (!Array.isArray(parsedResponse)) {
        throw new Error("Response is not an array");
      }

      const enhancedSlides = parsedResponse.map((slide) => {
        if (!Array.isArray(slide.content) || slide.content.length < 2) {
          const content = Array.isArray(slide.content)
            ? slide.content[0]
            : slide.content;
          if (typeof content === "string") {
            const sentences = content.split(/[.!?]+/).filter((s) => s.trim());
            slide.content = sentences.slice(0, 3).map((s) => s.trim() + ".");

            while (slide.content.length < 2) {
              slide.content.push(`Additional point for ${slide.title}.`);
            }
          }
        }
        return slide;
      });

      const validSlides = enhancedSlides.filter(
        (slide): slide is slideContent => {
          return (
            typeof slide === "object" &&
            slide !== null &&
            typeof slide.title === "string" &&
            Array.isArray(slide.content) &&
            slide.content.every((item: unknown) => typeof item === "string") &&
            slide.content.length >= 2 &&
            slide.content.length <= 4
          );
        },
      );

      if (validSlides.length === slideCount) {
        return validSlides;
      }

      while (validSlides.length < slideCount) {
        validSlides.push({
          title: `Additional Slide ${validSlides.length + 1}`,
          content: [
            "Key point about the topic.",
            "Supporting information and details.",
          ],
        });
      }

      return validSlides.slice(0, slideCount);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      console.error("Attempted to parse:", cleanedResponse);
      return null;
    }
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
    throw new Error(`Failed to upload PowerPoint file`);
  }
};
