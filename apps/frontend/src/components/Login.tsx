import type { JSX } from "solid-js";

export function Login(props: { onSubmit: JSX.IntrinsicElements['form']['onSubmit'] }) {
  return (
    <div class="flex flex-col justify-center py-4 sm:px-6 lg:px-8">
      <div class="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 class="mt-3 text-center text-2xl/9 font-semibold tracking-tight text-gray-600">Choose Username</h2>
      </div>

      <div class="mt-2 sm:mx-auto sm:w-full sm:max-w-[480px]">
        <div class="bg-white px-6 py-4 shadow sm:rounded-lg sm:px-6">
          <form class="space-y-3" action="/call" method="post" onSubmit={props.onSubmit}>
            <div>
              <label for="email" class="block text-sm/6 font-medium text-gray-900">Username</label>
              <div class="mt-2">
                <input id="name" name="name" type="text" autocomplete="email" required class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm/6" />
              </div>
            </div>

            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <input id="remember-me" name="remember-me" type="checkbox" class="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" />
                <label for="remember-me" class="ml-3 block text-sm/6 text-gray-900">Remember me</label>
              </div>
            </div>

            <div>
              <button type="submit" class="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">Sign in</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}