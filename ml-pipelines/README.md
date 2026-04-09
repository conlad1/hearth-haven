uvicorn server:app --port 8000 --reload

## Local Environment Setup

Follow these steps to set up a clean Python virtual environment, install the required dependencies, and configure your Jupyter notebooks to use the correct kernel.

### 1. Create a Virtual Environment

Navigate to the project directory (e.g., `ml-pipelines`) in your terminal and create a new virtual environment named `intex`:

```bash
cd ml-pipelines
python3 -m venv intex
```

### 2. Activate the Environment

You must activate the virtual environment every time you work on this project.

- **macOS/Linux**: `source intex/bin/activate`
- **Windows (PowerShell)**: `.\intex\Scripts\activate`

(You will know it is active when you see (intex) at the beginning of your terminal prompt).

### 3. Install Dependencies

With the environment active, upgrade pip and install the required packages from the requirements file:

```Bash
pip install --upgrade pip
pip install -r requirements.txt
python3 -m pip install -r requirements.txt # The other one usually works, but for some reason it didn't for me, so I had to run this command. Maybe it will be the same for you. (Michelle)
```

### 4. Configure the Jupyter Kernel

To ensure your Jupyter Notebooks run using the packages we just installed, link this virtual environment to Jupyter by running:

```Bash
python3 -m ipykernel install --user --name=intex --display-name="INTEX Pipelines"
```

NOTE: You might have to reload the window to update your VS Code.

#### ⚠️ Troubleshooting: "ModuleNotFoundError" in VS Code

If you have activated the virtual environment and installed the requirements, but your Jupyter Notebooks are still throwing `ModuleNotFoundError` (especially for packages like `pandas`, `sklearn`, or `matplotlib`), **VS Code is likely using the wrong kernel.**

**The Fix:**

1. Look at the top-right corner of your open notebook in VS Code.
2. If it says a generic Python version (e.g., `Python 3.13.2`) instead of `INTEX Pipelines`, click it.
3. Select **Select Another Kernel...** -> **Jupyter Kernel**.
4. Choose the kernel named **INTEX Pipelines**.

**If the kernel is completely broken or missing, regenerate it:**
Make sure your virtual environment is active in the terminal, then run:

```bash
jupyter kernelspec uninstall intex
python3 -m ipykernel install --user --name=intex --display-name="INTEX Pipelines"
```
