import { Request, Response } from "express";
import { validationResult } from "express-validator";
import puppeteer, { ElementHandle } from "puppeteer";
import { v2 as cloudinary } from "cloudinary";
import { v4 as uuidv4 } from "uuid";

// Utilities
import delay from "../utils/delay";
import slugify from "../utils/slugify";

// Models
import Case from "../models/case";

// RabbitMQ Channel
import { getChannel } from "../rabbitmq";

export const createCase = async (req: Request, res: Response): Promise<any> => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ message: "Validation failed", errors: errors.array() });
    }

    const url: string = req.body.url;

    const browser = await puppeteer.launch({
      timeout: 0,
    });
    const page = await browser.newPage();

    page.setDefaultNavigationTimeout(0);
    await page.goto(url);

    await page.waitForSelector(".header-title", { visible: true });
    const caseTitleElement = await page.$(".header-title");
    const caseTitle: string = await (
      caseTitleElement as ElementHandle
    ).evaluate((el: any) => el.textContent?.trim() || "");
    const caseTitleSlug = slugify(caseTitle);

    // const mainFolderPath = `cases/${caseTitleSlug}-${uuidv4()}`;
    // await cloudinary.api.create_folder(mainFolderPath);

    await page.waitForSelector(".case-study", {
      visible: true,
      timeout: 15000,
    });
    const caseStudyElements = await page.$$(".case-study");
    if (caseStudyElements.length === 0) {
      return res.status(400).json({
        message: "The provided URL is an invalid Radiopaedia case URL",
      });
    }

    let data = [];
    let thumbnail = "";

    for (const caseStudyElement of caseStudyElements) {
      await caseStudyElement.waitForSelector(
        "._StudyCarouselHeader_ImageListItem",
        {
          visible: true,
          timeout: 15000,
        }
      );
      const thumbnailElements = await caseStudyElement.$$(
        "._StudyCarouselHeader_ImageListItem"
      );

      for (const thumbnailElementIndex in thumbnailElements) {
        const thumbnailElement = thumbnailElements[thumbnailElementIndex];

        await delay(1000);
        await thumbnailElement.click();

        const subCaseTitleElement = await thumbnailElement.$(
          "._StudyCarouselHeader_ImageListCaption"
        );
        const subCaseTitle = await (
          subCaseTitleElement as ElementHandle
        ).evaluate((el: any) => el.textContent?.trim() || "");
        const subCaseTitleSlug = slugify(subCaseTitle);

        await delay(10000);
        const divsNextToImgs = await page.$$(".l52znt0");
        const thumbnailDiv = divsNextToImgs[thumbnailElementIndex];
        const imgContainer = await page.evaluateHandle(
          (el) => el.previousElementSibling,
          thumbnailDiv
        );
        const img = await (imgContainer as ElementHandle).$("img");
        const currentImgSrc: string = await (img as ElementHandle)
          .getProperty("src")
          .then((src: any) => src.jsonValue());

        // const subCaseFolderPath = `${mainFolderPath}/${subCaseTitleSlug}`;
        // await cloudinary.api.create_folder(subCaseFolderPath);

        // const thumbnailUploadResult = await cloudinary.uploader.upload(
        //   currentImgSrc,
        //   {
        //     folder: subCaseFolderPath,
        //   }
        // );

        let subCase: any = {
          title: subCaseTitle || "",
          thumbnail: currentImgSrc,
        };

        if (!thumbnail) {
          thumbnail = currentImgSrc;
        }

        const mainImgDiv = divsNextToImgs[divsNextToImgs.length - 1];
        const mainImgContainer = await page.evaluateHandle(
          (el) => el.previousElementSibling,
          mainImgDiv
        );

        const mainImg = await (mainImgContainer as ElementHandle).$("img");

        let prevImg = "";

        while (true) {
          const currentImgSrc = await (mainImg as ElementHandle)
            .getProperty("src")
            .then((src) => src.jsonValue());

          if (prevImg === currentImgSrc) {
            break;
          }

          await delay(500);
          await (mainImg as ElementHandle).hover();
          await (mainImg as ElementHandle).focus();
          await page.keyboard.press("ArrowUp");
          prevImg = currentImgSrc as string;
        }

        prevImg = "";
        const uploadedImagesUrls = [];
        // let count = 1;

        while (true) {
          const currentImgSrc = await (mainImg as ElementHandle)
            .getProperty("src")
            .then((src) => src.jsonValue());

          if (currentImgSrc === prevImg) {
            break;
          }

          // const fileName = `${count}`;
          // const mainImgUploadResult = await cloudinary.uploader.upload(
          //   currentImgSrc as string,
          //   {
          //     folder: subCaseFolderPath,
          //     public_id: fileName,
          //   }
          // );

          uploadedImagesUrls.push(currentImgSrc);

          await delay(500);
          await (mainImg as ElementHandle).hover();
          await (mainImg as ElementHandle).focus();
          await page.keyboard.press("ArrowDown");

          prevImg = currentImgSrc as string;
          // count++;
        }

        subCase = { ...subCase, images: uploadedImagesUrls };
        data.push(subCase);
      }
    }

    await browser.close();

    const newCase = new Case({
      title: caseTitle,
      data,
      thumbnail,
    });

    await newCase.save();

    // const userId = req.body.userId;
    // const data = req.body.data;
    // const message = { url, timestamp: Date.now() };
    // const channel = getChannel();

    // channel.sendToQueue("tasks", Buffer.from(JSON.stringify(message)));
    // return res.status(202).json({ message: "Task queued" });

    return res.status(201).json({ message: "The case was added successfully" });
  } catch (e) {
    console.log(e);
    return res
      .status(500)
      .json({ message: "An error occurred while trying to add the case" });
  }
};

export const getCases = async (req: Request, res: Response): Promise<any> => {
  try {
    const page = parseInt(req.query?.page as string) || 1;
    const skip = (page - 1) * 10;

    const total = await Case.countDocuments();

    const cases = await Case.find({}, "title thumbnail createdAt")
      .skip(skip)
      .limit(10)
      .lean();

    if (cases.length === 0) {
      return res.status(404).json({ message: "No cases found" });
    }

    return res
      .status(200)
      .json({ mesage: "Cases found successfully", cases, total });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch the cases" });
  }
};

export const getCase = async (req: Request, res: Response): Promise<any> => {
  try {
    const id: string = req.params.id as string;

    const fetchedCase = await Case.findOne({ _id: id }).lean();

    if (!fetchedCase) {
      return res.status(404).json({ message: "No case found" });
    }

    return res
      .status(200)
      .json({ mesage: "Case found successfully", case: fetchedCase });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch the case" });
  }
};
