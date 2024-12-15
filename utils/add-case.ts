import puppeteer, { ElementHandle } from "puppeteer";
import { v2 as cloudinary } from "cloudinary";
import { v4 as uuidv4 } from "uuid";

// Utilities
import delay from "../utils/delay";
import slugify from "../utils/slugify";

// Models
import Case from "../models/case";

export default async function addCase(url: string) {
  // const url: string = req.body.url;

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto(url, { timeout: 60000 });

  await page.waitForSelector(".header-title", {
    visible: true,
    timeout: 15000,
  });
  const caseTitleElement = await page.$(".header-title");
  const caseTitle: string = await (caseTitleElement as ElementHandle).evaluate(
    (el: any) => el.textContent?.trim() || ""
  );
  const caseTitleSlug = slugify(caseTitle);

  const mainFolderPath = `cases/${caseTitleSlug}-${uuidv4()}`;
  console.log(mainFolderPath);
  await cloudinary.api.create_folder(mainFolderPath);

  await page.waitForSelector(".case-study", {
    visible: true,
    timeout: 15000,
  });
  const caseStudyElements = await page.$$(".case-study");
  // if (caseStudyElements.length === 0) {
  //   return res.status(400).json({
  //     message: "The provided URL is an invalid Radiopaedia case URL",
  //   });
  // }

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
      // const subCaseTitleSlug = slugify(subCaseTitle);

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
}
