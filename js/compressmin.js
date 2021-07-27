let zip = new JSZip();
let files;
let promises = [];

class ImageObject {
  constructor(quality) {
    this.alt = null;
    this.ext = null;
    this.startSize = null;
    this.size = 4 * 1000 * 1000;
    this.finalSize = null;
    this.quality = quality;
    this.maxWidth = 1920;
    this.maxHeight = 1920;
  }
}

let format = document.getElementById("format").value;
const changeFormat = (e) => {
  format = e.value;
};

const sizebase64 = (base64) => {
  const len = base64.replace(/^data:image\/\w+;base64,/, "").length;
  return (len - 814) / 1.37;
};

const mime = (base64) => {
  return base64.split(";")[0].match(/jpeg|png|gif/)[0];
};

const data = (base64) => {
  return base64.replace(/^data:image\/\w+;base64,/, "");
};

const base64ToFile = (base64, mime = "image/jpeg") => {
  const byteString = window.atob(base64);
  const content = [];
  for (let i = 0; i < byteString.length; i++) {
    content[i] = byteString.charCodeAt(i);
  }
  return new window.Blob([new Uint8Array(content)], { type: mime });
};

const imgToCanvas = (width, height) => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = width;
  canvas.height = height;

  return (image) => {
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas;
  };
};

const canvasToBase64 = (canvas, quality = 0.75) => {
  const base64 = canvas.toDataURL("image/jpeg", quality);
  return base64;
};

const load = (file) => {
  return new Promise((resolve) => {
    const fileReader = new window.FileReader();
    fileReader.addEventListener(
      "load",
      (e) => {
        resolve(e.target.result);
      },
      false
    );
    fileReader.readAsDataURL(file);
  });
};

const loadImg = (src) => {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.addEventListener(
      "load",
      () => {
        resolve(img);
      },
      false
    );
    img.src = src;
  });
};

let ImageCompressor = (file, quality) => {
  function compress(file, quality) {
    const img = new ImageObject(quality);
    img.alt = file.name;
    img.ext = file.type;
    img.startSize = file.size;
    return load(file).then(compressImg(img));
  }
  function compressImg(img) {
    return (src) => {
      return loadImg(src)
        .then((img) => {
          img.endWidth = img.naturalWidth;
          img.endHeight = img.naturalHeight;
          return imgToCanvas(img.endWidth, img.endHeight)(img);
        })
        .then((canvas) => {
          return loopCompression(
            canvas,
            img.startSize,
            img.quality,
            img.size,
            img.minQuality
          );
        })
        .then(async (base64) => {
          img.finalSize = sizebase64(base64);
          let link = document.createElement("a");
          link.download = img.alt + "-pic-engine" + format;
          link.href = base64;
          // link.innerText = "Download Image"
          // link.className = "btn btn-success";
          // let container = document.getElementById("link-container")
          // container.appendChild(link)
          if (files.length === 1) {
            link.click();
          } else if (files.length > 1) {
            await zip.file(
              img.alt + "-pic-engine" + format,
              base64.split("base64,")[1],
              { base64: true }
            );
          }
          // link.click()
          return data(base64);
        })
        .then(() => {
          return {
            FileName: img.alt,
            OriginalSize: img.startSize,
            CompressedSize: img.finalSize,
            ext: img.ext,
            quality: img.quality,
            ReducedSize:
              ((img.startSize - img.finalSize) / img.startSize) * 100,
          };
        });
    };
  }
  const loopCompression = (
    canvas,
    size,
    quality = 1,
    targetSize,
    targetQuality = 1
  ) => {
    const base64str = canvasToBase64(canvas, quality);
    const newSize = sizebase64(base64str);
    if (newSize > targetSize) {
      return loopCompression(
        canvas,
        newSize,
        quality - 0.1,
        targetSize,
        targetQuality
      );
    }

    if (quality > targetQuality) {
      return loopCompression(
        canvas,
        newSize,
        quality - 0.1,
        targetSize,
        targetQuality
      );
    }

    if (quality < 0.25) {
      return base64str;
    }
    return base64str;
  };
  return Promise.all(
    files.map((file) => {
      return compress(file, quality);
    })
  );
};

let quality = parseFloat(document.getElementById("select").value);
const changeQuality = (e) => {
  quality = parseFloat(e.value);
};

const upload = document.getElementById("upload");
const upload1 = document.getElementById("upload1");
const compressbtn = document.getElementById("compressbtn");
upload.addEventListener(
  "change",
  function (e) {
    files = [...e.target.files];
  },
  false
);
upload1.addEventListener(
  "change",
  function (e) {
    files = [...e.target.files];
  },
  false
);

compressbtn.addEventListener("click", function () {
  upload.value = null;
  ImageCompressor(files, quality);
  if (files.length > 1) {
    setTimeout(() => {
      zip.generateAsync({ type: "blob" }).then(function (content) {
        // see FileSaver.js
        saveAs(content, "compressedImages.zip");
      });
    }, files.length * 500);
  }
});
